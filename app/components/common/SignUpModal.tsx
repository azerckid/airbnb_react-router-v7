import { useState } from "react";
import {
    Box,
    Button,
    CloseButton,
    DialogBackdrop,
    DialogBody,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogPositioner,
    DialogRoot,
    IconButton,
    Input,
    VStack,
} from "@chakra-ui/react";
import { FaEnvelope, FaLock, FaUserNinja, FaUserSecret, FaEye, FaEyeSlash } from "react-icons/fa";
import { SocialLogin } from "./SocialLogin";
import { signUp, login } from "~/utils/api";
import { toaster } from "~/components/ui/toaster";
import { signUpSchema } from "~/utils/validation";
import { parseApiError } from "~/utils/error";

interface SignUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSignUpSuccess?: () => void;
}

export function SignUpModal({ isOpen, onClose, onSignUpSuccess }: SignUpModalProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 입력값 검증
        const validationResult = signUpSchema.safeParse({ name, email, username, password, passwordConfirm });
        if (!validationResult.success) {
            const firstError = validationResult.error.issues[0];
            toaster.create({
                title: "입력 오류",
                description: firstError.message,
                type: "error",
                duration: 3000,
            });
            return;
        }

        setIsLoading(true);

        try {
            // 회원가입
            await signUp(name, email, username, password);

            // 회원가입 성공 후 자동 로그인
            await login(username, password);

            // 폼 초기화
            setName("");
            setEmail("");
            setUsername("");
            setPassword("");
            setPasswordConfirm("");
            setShowPassword(false);
            setShowPasswordConfirm(false);

            // 모달 먼저 닫기
            onClose();

            // 토스트 생성
            toaster.create({
                title: "회원가입 성공",
                description: "자동으로 로그인되었습니다.",
                type: "success",
                duration: 5000,
            });

            // onSignUpSuccess 호출하여 즉시 상태 업데이트
            onSignUpSuccess?.();
        } catch (error) {
            const errorMessage = parseApiError(error, "회원가입에 실패했습니다. 다시 시도해주세요.");

            toaster.create({
                title: "회원가입 실패",
                description: errorMessage,
                type: "error",
                duration: 3000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DialogRoot open={isOpen} placement="center" onOpenChange={(e) => { if (!e.open) onClose(); }}>
            <DialogBackdrop />
            <DialogPositioner>
                <DialogContent>
                    <DialogHeader>Sign up</DialogHeader>
                    <CloseButton position="absolute" top="3" insetEnd="3" onClick={onClose} />
                    <form onSubmit={handleSubmit}>
                        <DialogBody>
                            <VStack gap={4}>
                                <Box position="relative" w="100%">
                                    <Input
                                        pl="10"
                                        variant="outline"
                                        placeholder="Name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                    <Box
                                        position="absolute"
                                        insetY="0"
                                        left="3"
                                        display="flex"
                                        alignItems="center"
                                        color="gray.300"
                                        pointerEvents="none"
                                    >
                                        <FaUserSecret size={18} />
                                    </Box>
                                </Box>
                                <Box position="relative" w="100%">
                                    <Input
                                        pl="10"
                                        variant="outline"
                                        placeholder="Email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                    <Box
                                        position="absolute"
                                        insetY="0"
                                        left="3"
                                        display="flex"
                                        alignItems="center"
                                        color="gray.300"
                                        pointerEvents="none"
                                    >
                                        <FaEnvelope size={18} />
                                    </Box>
                                </Box>
                                <Box position="relative" w="100%">
                                    <Input
                                        pl="10"
                                        variant="outline"
                                        placeholder="Username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                    <Box
                                        position="absolute"
                                        insetY="0"
                                        left="3"
                                        display="flex"
                                        alignItems="center"
                                        color="gray.300"
                                        pointerEvents="none"
                                    >
                                        <FaUserNinja size={18} />
                                    </Box>
                                </Box>
                                <Box position="relative" w="100%">
                                    <Input
                                        pl="10"
                                        pr="10"
                                        variant="outline"
                                        placeholder="Password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <Box
                                        position="absolute"
                                        insetY="0"
                                        left="3"
                                        display="flex"
                                        alignItems="center"
                                        color="gray.300"
                                        pointerEvents="none"
                                    >
                                        <FaLock size={18} />
                                    </Box>
                                    <IconButton
                                        position="absolute"
                                        insetY="0"
                                        right="0"
                                        variant="ghost"
                                        size="sm"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        onClick={() => setShowPassword(!showPassword)}
                                        color="gray.500"
                                        _hover={{ color: "gray.700" }}
                                    >
                                        {showPassword ? <FaEye size={18} /> : <FaEyeSlash size={18} />}
                                    </IconButton>
                                </Box>
                                <Box position="relative" w="100%">
                                    <Input
                                        pl="10"
                                        pr="10"
                                        variant="outline"
                                        placeholder="Confirm Password"
                                        type={showPasswordConfirm ? "text" : "password"}
                                        value={passwordConfirm}
                                        onChange={(e) => setPasswordConfirm(e.target.value)}
                                        required
                                    />
                                    <Box
                                        position="absolute"
                                        insetY="0"
                                        left="3"
                                        display="flex"
                                        alignItems="center"
                                        color="gray.300"
                                        pointerEvents="none"
                                    >
                                        <FaLock size={18} />
                                    </Box>
                                    <IconButton
                                        position="absolute"
                                        insetY="0"
                                        right="0"
                                        variant="ghost"
                                        size="sm"
                                        aria-label={showPasswordConfirm ? "Hide password" : "Show password"}
                                        onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                                        color="gray.500"
                                        _hover={{ color: "gray.700" }}
                                    >
                                        {showPasswordConfirm ? <FaEye size={18} /> : <FaEyeSlash size={18} />}
                                    </IconButton>
                                </Box>
                            </VStack>
                        </DialogBody>
                        <DialogFooter>
                            <Button
                                type="submit"
                                colorPalette="red"
                                w="100%"
                                loading={isLoading}
                            >
                                {isLoading ? "Signing up..." : "Sign up"}
                            </Button>
                        </DialogFooter>
                    </form>
                    <Box px={6}>
                        <SocialLogin />
                    </Box>
                </DialogContent>
            </DialogPositioner>
        </DialogRoot>
    );
}


