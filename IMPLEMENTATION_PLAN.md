# 항공편 검색 및 여행 계획 구현 계획서

## 개요
- **출발지**: 한국 국제공항 14개
- **목적지**: DB에 숙소 데이터가 있는 도시 8개
- **검색 전략**: 각 출발지-목적지 조합에서 가장 빠른 출발 항공편 1개만 선택
  - **당장 출발 가능 조건**: 오늘 또는 내일 출발 항공편만 검색
  - 오늘 날짜로 검색 → 없으면 다음날 검색 → 없으면 항공편 없음으로 간주
- **총 검색 조합**: 14 × 8 = 112개
- **최대 검색 횟수**: 112 × 2 = 224번 (각 조합당 오늘 + 다음날)
- **여행 기간**: 5-7일 (평균 6일)
- **예산**: 100만원

---

## 단계별 구현 계획

### Phase 1: 데이터 준비 및 검증 ✅ (완료)
- [x] DB에서 숙소가 있는 도시 목록 조회 (8개 도시 확인)
- [x] 목적지 도시-공항 매핑 설정 (`destination-mapping.ts`)
- [x] 한국 국제공항 목록 설정 (`korean-airports.ts` - 14개 공항)

**결과물:**
- `app/services/ai/tools/destination-mapping.ts`
- `app/services/ai/tools/korean-airports.ts`

---

### Phase 2: 검색 조합 생성
**목표**: 모든 출발지-목적지 조합 생성

**작업 내용:**
1. 한국 국제공항 14개 목록 가져오기
   - `getAllKoreanAirports()` 사용
   - 공항 코드 배열 생성: `[ICN, GMP, PUS, CJU, TAE, YNY, KUV, USN, RSU, WJU, MWX, CJJ, KWJ, KPO]`

2. 목적지 도시 8개 목록 가져오기
   - `getAllDestinationCities()` 사용
   - 목적지 배열 생성: `[{country, city, airportCode}, ...]`

3. 조합 생성
   - 각 출발지 × 각 목적지 = 14 × 8 = 112개 조합
   - 각 조합: `{origin: "ICN", destination: "FUK", destinationCity: "Fukuoka-City", destinationCountry: "Japan"}`

**예상 코드 위치:**
- `app/services/ai/nodes.ts` - `autoRecommendationNode` 함수 내

**검증:**
- 총 112개 조합이 생성되는지 확인
- 각 조합에 출발지, 목적지 공항 코드, 도시, 국가 정보 포함 확인

---

### Phase 3: 항공편 검색 로직 구현
**목표**: 각 조합에서 가장 빠른 출발 항공편 1개만 찾기 + 즉시 스트리밍

**작업 내용:**
1. 검색 전략
   - **당장 출발 가능** 조건: 오늘 또는 내일 출발 항공편만 검색
   - 각 조합별로 첫 번째 항공편만 찾으면 즉시 다음 조합으로 이동
   - 오늘 날짜로 검색 → 없으면 다음날 검색 → 없으면 항공편 없음으로 간주
   - **중요**: 첫 번째 항공편을 찾으면 즉시 스트리밍으로 사용자에게 표시
   - 나머지 조합 검색은 백그라운드에서 계속 진행

2. 검색 함수 수정
   - `searchFirstAvailableFlight` 새 함수 생성
   - 파라미터: `origin`, `destination`, `todayDate`
   - 로직:
     1. 오늘 날짜로 항공편 검색 (시간 필터 없음, 모든 항공편)
     2. 결과가 있으면 출발 시간 기준 정렬 후 첫 번째 반환
     3. 결과가 없으면 다음날 날짜로 검색
     4. 다음날 결과가 있으면 첫 번째 반환
     5. 다음날도 없으면 `null` 반환
   - 반환: 항공편 1개 또는 null

3. 스트리밍 전략
   - **첫 항공편 발견 시 즉시 스트리밍**
   - 첫 항공편을 찾으면:
     1. 즉시 사용자에게 스트리밍으로 표시 시작
     2. 임시 결과로 숙소 검색 및 비용 계산
     3. AI 응답 생성 시작 (스트리밍)
   - 백그라운드에서 나머지 조합 계속 검색
   - 더 빠른 항공편을 찾으면 업데이트 (선택적)

4. 병렬/순차 처리 결정
   - 옵션 A: 순차 처리 (안정적, API 제한 고려)
   - 옵션 B: 병렬 처리 (빠름, API 제한 주의)
   - **권장**: 순차 처리 (API 제한 및 안정성 고려)
   - **스트리밍**: 첫 결과 발견 시 즉시 응답 시작

5. 결과 수집
   - 각 조합의 결과를 배열에 저장
   - `{origin, destination, flight, destinationCity, destinationCountry, searchDate}` 형태
   - `flight`가 `null`인 경우도 포함 (항공편 없는 조합)
   - 첫 번째 유효한 결과 발견 시 즉시 스트리밍 시작

**예상 코드 구조:**
```typescript
async function searchFirstAvailableFlight(
    origin: string,
    destination: string,
    todayDate: string
): Promise<FlightOffer | null> {
    // 1. 오늘 날짜로 검색
    const todayFlights = await searchFlights(origin, destination, todayDate);
    if (Array.isArray(todayFlights) && todayFlights.length > 0) {
        // 출발 시간 기준 정렬 후 첫 번째 반환
        todayFlights.sort((a, b) => {
            return new Date(a.departure.at).getTime() - new Date(b.departure.at).getTime();
        });
        return todayFlights[0];
    }
    
    // 2. 다음날 날짜로 검색
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    
    const tomorrowFlights = await searchFlights(origin, destination, tomorrowDate);
    if (Array.isArray(tomorrowFlights) && tomorrowFlights.length > 0) {
        tomorrowFlights.sort((a, b) => {
            return new Date(a.departure.at).getTime() - new Date(b.departure.at).getTime();
        });
        return tomorrowFlights[0];
    }
    
    // 3. 오늘과 내일 모두 없으면 null 반환
    return null;
}

const searchResults = [];
for (const origin of koreanAirports) {
    for (const dest of destinationCities) {
        const flight = await searchFirstAvailableFlight(
            origin.iataCode,
            dest.airportCode,
            todayDate
        );
        
        searchResults.push({
            origin: origin.iataCode,
            destination: dest.airportCode,
            flight: flight, // null일 수 있음
            destinationCity: dest.city,
            destinationCountry: dest.country,
            searchDate: flight ? (flight.departure.at.split('T')[0]) : null
        });
        // 첫 번째 항공편을 찾았으므로 이 조합은 종료하고 다음 조합으로
    }
}
```

**검증:**
- 각 조합에서 최대 2번 검색 (오늘 + 다음날)되는지 확인
- 총 검색 횟수가 112 × 2 = 224개를 넘지 않는지 확인
- 항공편이 없는 조합도 결과에 포함되는지 확인
- API 호출 횟수 모니터링

---

### Phase 4: 항공편 결과 정렬 및 선택
**목표**: 찾은 항공편 중 가장 빠른 출발 시간의 항공편 선택

**작업 내용:**
1. 모든 검색 결과 수집
   - Phase 3에서 수집한 `searchResults` 배열 사용
   - 항공편이 있는 결과만 필터링 (`flight !== null`)

2. 정렬
   - 출발 시간 기준 오름차순 정렬
   - `flight.departure.at` 기준
   - 오늘 출발 항공편이 내일 출발 항공편보다 우선

3. 최종 선택
   - 가장 빠른 출발 시간의 항공편 1개 선택
   - 해당 항공편의 출발지, 목적지, 도시, 국가 정보 저장
   - **중요**: 항공편이 하나도 없는 경우 처리 필요

4. 항공편 없음 처리
   - 모든 조합에서 항공편을 찾지 못한 경우
   - 사용자에게 "당장 출발 가능한 항공편이 없습니다" 메시지 표시

**예상 코드:**
```typescript
// 항공편이 있는 결과만 필터링
const validResults = searchResults.filter(result => result.flight !== null);

if (validResults.length === 0) {
    // 항공편이 하나도 없는 경우
    logs.push("⚠️ 모든 조합에서 항공편을 찾을 수 없었습니다.");
    // 사용자에게 안내 메시지 반환
    return {
        answer: "죄송하지만, 당장 출발 가능한 항공편을 찾을 수 없었습니다.",
        foundFlights: [],
        foundRooms: [],
        logs
    };
}

// 모든 검색 결과를 출발 시간으로 정렬
const sortedResults = validResults.sort((a, b) => {
    const timeA = new Date(a.flight.departure.at).getTime();
    const timeB = new Date(b.flight.departure.at).getTime();
    return timeA - timeB;
});

// 가장 빠른 항공편 선택
const bestResult = sortedResults[0];
```

**검증:**
- 정렬이 올바르게 되는지 확인
- 선택된 항공편이 가장 빠른 출발 시간인지 확인
- 항공편이 없는 경우 처리 확인

---

### Phase 5: 숙소 검색
**목표**: 선택된 항공편의 목적지 도시로 숙소 검색

**작업 내용:**
1. 목적지 정보 추출
   - 선택된 항공편의 `destinationCountry` 사용
   - 또는 `destinationCity` 사용 (더 정확)

2. 예산 계산
   - 총 예산: 1,000,000원
   - 항공편 비용: `bestResult.flight.price.total`
   - 식사 비용: 6일 × 3끼 × 15,000원 = 270,000원
   - 숙소 예산: 1,000,000 - 항공편비용 - 270,000

3. 숙소 검색
   - `searchStructuredRooms({ location: destinationCountry, maxPrice: roomBudget, limit: 3 })`
   - 목적지 국가명으로 검색

4. 숙소 선택
   - 검색 결과 중 첫 번째 숙소 선택
   - 또는 예산 내 가장 적합한 숙소 선택

**예상 코드:**
```typescript
const destinationCountry = bestResult.destinationCountry;
const flightCost = parseFloat(bestResult.flight.price.total);
const mealCost = 6 * 3 * 15000; // 270,000
const roomBudget = 1000000 - flightCost - mealCost;

const rooms = await searchStructuredRooms({
    location: destinationCountry,
    maxPrice: roomBudget,
    limit: 3
});

const selectedRoom = rooms[0];
```

**검증:**
- 숙소 검색이 올바른 목적지로 수행되는지 확인
- 예산 계산이 정확한지 확인
- 숙소가 없는 경우 처리 확인

---

### Phase 6: 비용 계산 및 최종 결과 생성
**목표**: 전체 여행 비용 계산 및 최종 여행 계획 생성

**작업 내용:**
1. 비용 계산
   - 항공편 비용
   - 숙소 비용: 1박 × 6일
   - 식사 비용: 270,000원
   - 총 비용 계산

2. 예산 대비 분석
   - 목표 예산: 1,000,000원
   - 총 비용과 비교
   - 예산 초과 여부 확인

3. 최종 결과 구성
   - 선택된 항공편 정보
   - 선택된 숙소 정보
   - 비용 정보
   - 여행 기간 정보

**예상 코드:**
```typescript
const totalCost = flightCost + (roomCostPerNight * 6) + mealCost;
const isWithinBudget = totalCost <= 1000000;

const finalResult = {
    flight: bestResult.flight,
    accommodation: selectedRoom,
    costs: {
        flight: flightCost,
        accommodation: roomCostPerNight * 6,
        meals: mealCost,
        total: totalCost
    },
    budget: {
        target: 1000000,
        actual: totalCost,
        isWithinBudget: isWithinBudget
    },
    duration: 6 // days
};
```

**검증:**
- 비용 계산이 정확한지 확인
- 예산 대비 분석이 올바른지 확인

---

### Phase 7: AI 응답 생성 및 스트리밍
**목표**: 첫 번째 항공편 발견 시 즉시 스트리밍으로 응답 생성

**작업 내용:**
1. 스트리밍 전략
   - **첫 항공편 발견 시 즉시 응답 시작**
   - 첫 번째 유효한 항공편을 찾으면:
     1. 즉시 스트리밍 시작 (사용자 대기 시간 최소화)
     2. 해당 항공편으로 숙소 검색
     3. 비용 계산
     4. AI 응답 생성 및 스트리밍
   - 백그라운드에서 나머지 조합 계속 검색
   - 더 빠른 항공편 발견 시 업데이트 (선택적)

2. Context 구성
   - 첫 번째 발견된 항공편 정보
   - 검색된 숙소 정보
   - 비용 정보
   - 여행 기간 정보
   - 검색 진행 상황 (예: "112개 조합 중 X개 검색 완료")

3. AI 프롬프트 수정
   - 새로운 검색 전략 반영
   - 112개 조합 검색 설명
   - 가장 빠른 출발 항공편 선택 설명
   - 첫 번째 발견 항공편임을 명시

4. 응답 생성
   - 기존 프롬프트 템플릿 사용
   - Context 데이터 주입
   - 한국어 응답 생성
   - **스트리밍으로 실시간 표시**

5. 스트리밍 구현
   - LangGraph의 스트리밍 기능 활용
   - 첫 결과 발견 시 즉시 이벤트 발생
   - 클라이언트에서 실시간 업데이트

**예상 코드 구조:**
```typescript
let firstResultFound = false;

for (const origin of koreanAirports) {
    for (const dest of destinationCities) {
        const flight = await searchFirstAvailableFlight(
            origin.iataCode,
            dest.airportCode,
            todayDate
        );
        
        if (flight && !firstResultFound) {
            // 첫 번째 항공편 발견 - 즉시 스트리밍 시작
            firstResultFound = true;
            
            // 즉시 숙소 검색 및 응답 생성 시작
            const room = await searchStructuredRooms({...});
            const costs = calculateCosts(flight, room);
            
            // 스트리밍으로 응답 시작
            yield {
                type: 'flight_found',
                flight: flight,
                room: room,
                costs: costs,
                message: '첫 번째 항공편을 찾았습니다. 계속 검색 중...'
            };
        }
        
        searchResults.push({...});
    }
}
```

**검증:**
- 첫 항공편 발견 시 즉시 스트리밍이 시작되는지 확인
- 사용자 대기 시간이 최소화되는지 확인
- AI 응답이 정확한 정보를 포함하는지 확인
- 마크다운 링크가 올바르게 생성되는지 확인

---

## 구현 순서

1. ✅ Phase 1: 데이터 준비 (완료)
2. **Phase 2: 검색 조합 생성** ← 다음 단계
3. Phase 3: 항공편 검색 로직 구현 + 첫 결과 스트리밍
4. Phase 4: 항공편 결과 정렬 및 선택 (백그라운드)
5. Phase 5: 숙소 검색 (첫 결과 발견 시 즉시)
6. Phase 6: 비용 계산 및 최종 결과 생성 (첫 결과 발견 시 즉시)
7. Phase 7: AI 응답 생성 및 스트리밍 (첫 결과 발견 시 즉시)

---

## 주요 변경 사항 요약

### 기존 로직
- 6시간 → 24시간 → 다음날 순차 검색
- 하나의 목적지에 집중
- Mock 데이터 사용 (항공편 없을 때)

### 새로운 로직
- 모든 출발지-목적지 조합 검색 (112개)
- 각 조합에서 가장 빠른 출발 항공편 1개만 찾기
  - 오늘 날짜로 검색 → 없으면 다음날 검색
  - 다음날도 없으면 항공편 없음으로 간주 (당장 출발 가능 조건)
- **첫 항공편 발견 시 즉시 스트리밍으로 사용자에게 표시**
- 백그라운드에서 나머지 조합 계속 검색
- 모든 조합의 결과 중 가장 빠른 출발 항공편 선택 (백그라운드)
- 실제 DB 기반 목적지만 사용
- 실제 항공편만 사용 (Mock 제거)
- 항공편이 하나도 없는 경우 명확한 안내
- **사용자 대기 시간 최소화**: 첫 결과 발견 시 즉시 응답 시작

---

## 예상 검색 시간

- **총 조합 수**: 112개
- **각 조합당 검색**: 최대 2번 (오늘 + 다음날)
- **각 검색당 시간**: 약 1-2초 (API 응답 시간)
- **최악의 경우**: 112 × 2 × 1.5초 = 약 336초 (약 5-6분)
- **최선의 경우**: 모든 항공편이 오늘 날짜에 있으면 112 × 1.5초 = 약 168초 (약 3분)
- **최적화 고려**: 병렬 처리 시 시간 단축 가능 (API 제한 주의)

---

## 주의사항

1. **API 제한**: Amadeus API 호출 제한 고려
2. **타임아웃**: 112개 조합 검색 시 타임아웃 설정 필요
3. **에러 처리**: 일부 조합 실패 시에도 다른 조합 계속 검색
4. **로깅**: 각 단계별 상세 로깅으로 디버깅 용이성 확보
5. **성능**: 필요시 병렬 처리 또는 배치 처리 고려
6. **스트리밍**: 첫 결과 발견 시 즉시 스트리밍 시작하여 사용자 대기 시간 최소화
7. **백그라운드 처리**: 첫 결과 스트리밍 후 나머지 검색은 백그라운드에서 계속 진행
8. **업데이트 전략**: 더 빠른 항공편 발견 시 업데이트 여부 결정 (선택적)

---

## 테스트 계획

1. **단위 테스트**
   - 검색 조합 생성 테스트
   - 항공편 검색 함수 테스트
   - 정렬 로직 테스트

2. **통합 테스트**
   - 전체 플로우 테스트
   - 실제 API 호출 테스트
   - 에러 케이스 테스트

3. **성능 테스트**
   - 112개 조합 검색 시간 측정
   - API 호출 횟수 확인
   - 메모리 사용량 확인

---

## 사용자 경험 개선

### 스트리밍 전략의 장점
1. **즉시 피드백**: 첫 항공편 발견 시 약 5-10초 내 응답 시작
2. **대기 시간 최소화**: 전체 검색 완료를 기다리지 않음
3. **점진적 정보 제공**: 첫 결과를 보여주고 백그라운드에서 계속 검색
4. **사용자 만족도 향상**: 빠른 응답으로 체감 대기 시간 감소

### 스트리밍 플로우
```
1. 검색 시작 (112개 조합)
2. 첫 항공편 발견 (평균 5-10초)
   ↓
3. 즉시 스트리밍 시작
   - 항공편 정보 표시
   - 숙소 검색 시작
   - 비용 계산
   - AI 응답 생성 및 스트리밍
   ↓
4. 백그라운드에서 나머지 조합 계속 검색
5. 더 빠른 항공편 발견 시 업데이트 (선택적)
```

---

## 다음 단계

**Phase 2부터 시작**: 검색 조합 생성 로직 구현
**Phase 3에서 스트리밍 로직 구현**: 첫 결과 발견 시 즉시 스트리밍 시작

