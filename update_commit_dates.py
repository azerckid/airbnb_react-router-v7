#!/usr/bin/env python3
import subprocess
import sys
from datetime import datetime, timedelta

# 가장 오래된 커밋이 2025-08-05 00:10:00이 되도록 설정
START_DATE = datetime(2025, 8, 11, 0, 10, 0)
HOURS_INTERVAL = 8

print("커밋 목록을 가져오는 중...")

# 원격 저장소에 푸시되지 않은 커밋만 가져오기 (가장 오래된 것부터)
result = subprocess.run(
    ['git', 'log', '--reverse', '--format=%H'],
    capture_output=True,
    text=True,
    check=True
)

commits = [c for c in result.stdout.strip().split('\n') if c]
total = len(commits)

# 가장 최신 커밋 날짜 계산
END_DATE = START_DATE + timedelta(hours=(total - 1) * HOURS_INTERVAL)

print(f"총 {total}개의 커밋 날짜를 변경합니다...")
print(f"가장 오래된 커밋 날짜: {START_DATE.strftime('%Y-%m-%d %H:%M:%S')}")
print(f"최신 커밋 날짜: {END_DATE.strftime('%Y-%m-%d %H:%M:%S')}")
print(f"간격: {HOURS_INTERVAL}시간")
print()

# 각 커밋의 날짜 미리보기
for i, commit in enumerate(commits):
    hours_offset = i * HOURS_INTERVAL
    new_date = START_DATE + timedelta(hours=hours_offset)
    print(f"커밋 {i+1}/{total}: {commit[:8]} -> {new_date.strftime('%Y-%m-%d %H:%M:%S')}")

print()
print("커밋 날짜를 변경하는 중...")

# Python 스크립트를 사용하여 날짜 계산
env_filter_script = f'''#!/usr/bin/env python3
import sys
from datetime import datetime, timedelta

START_DATE = datetime(2025, 8, 11, 0, 10, 0)
HOURS_INTERVAL = 8
COMMITS = {commits}
TOTAL = {total}

commit_hash = sys.argv[1] if len(sys.argv) > 1 else ""

try:
    idx = COMMITS.index(commit_hash)
    hours_offset = idx * HOURS_INTERVAL
    new_date = START_DATE + timedelta(hours=hours_offset)
    print(new_date.strftime("%Y-%m-%d %H:%M:%S"))
except (ValueError, IndexError):
    pass
'''

# 임시 파일에 Python 스크립트 작성
with open('/tmp/calc_date.py', 'w') as f:
    f.write(env_filter_script)

# 실행 권한 부여
subprocess.run(['chmod', '+x', '/tmp/calc_date.py'], check=True)

# git filter-branch 실행
env_filter = '''commit_hash="$GIT_COMMIT"
new_date=$(python3 /tmp/calc_date.py "$commit_hash")
if [ -n "$new_date" ]; then
    export GIT_AUTHOR_DATE="$new_date"
    export GIT_COMMITTER_DATE="$new_date"
fi
'''

# git filter-branch 실행
print("git filter-branch 실행 중... (시간이 걸릴 수 있습니다)")
result = subprocess.run(
    ['git', 'filter-branch', '-f', '--env-filter', env_filter, '--tag-name-filter', 'cat', '--', '--all'],
    check=False
)

if result.returncode == 0:
    print()
    print("✓ 완료! 커밋 날짜가 변경되었습니다.")
    print("변경사항을 확인하려면: git log --date=format:'%Y-%m-%d %H:%M:%S'")
else:
    print()
    print("✗ 오류가 발생했습니다. git filter-branch 실행에 실패했습니다.")
    sys.exit(1)
