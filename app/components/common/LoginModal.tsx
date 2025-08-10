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
    Input,
    VStack,
} from "@chakra-ui/react";
import { FaUserNinja, FaLock } from "react-icons/fa";
import { SocialLogin } from "./SocialLogin";
import { login } from "~/utils/api";
import { toaster } from "~/components/ui/toaster";
import { loginSchema } from "~/utils/validation";
import { parseApiError } from "~/utils/error";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess?: () => void;
}

export function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 입력값 검증
        const validationResult = loginSchema.safeParse({ username, password });
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
            await login(username, password);
            setUsername("");
            setPassword("");

            onClose();

            toaster.create({
                title: "로그인 성공",
                type: "success",
                duration: 5000,
            });
            window.location.reload();
            onLoginSuccess?.();
        } catch (error) {
            const errorMessage = parseApiError(error, "로그인에 실패했습니다. 다시 시도해주세요.");

            toaster.create({
                title: "로그인 실패",
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
                    <DialogHeader>Log in</DialogHeader>
                    <CloseButton position="absolute" top="3" insetEnd="3" onClick={onClose} />
                    <form onSubmit={handleSubmit}>
                        <DialogBody>
                            <VStack gap={4}>
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
                                        <FaUserNinja size={20} />
                                    </Box>
                                </Box>
                                <Box position="relative" w="100%">
                                    <Input
                                        pl="10"
                                        variant="outline"
                                        placeholder="Password"
                                        type="password"
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
                                {isLoading ? "Logging in..." : "Log in"}
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


