import { Box, Button, HStack, Separator, Text, VStack } from "@chakra-ui/react";
import { FaComment, FaGithub } from "react-icons/fa";

export function SocialLogin() {
    const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const getRedirectUri = () => {
        if (typeof window !== "undefined") {
            return `${window.location.origin}/auth/github/callback`;
        }
        return "/auth/github/callback";
    };
    const GITHUB_REDIRECT_URI = import.meta.env.VITE_GITHUB_REDIRECT_URI || getRedirectUri();

    const githubAuthUrl = GITHUB_CLIENT_ID
        ? `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=read:user,user:email`
        : "#";

    const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY;
    const getKakaoRedirectUri = () => {
        if (typeof window !== "undefined") {
            return `${window.location.origin}/auth/kakao/callback`;
        }
        return "/auth/kakao/callback";
    };
    const KAKAO_REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI || getKakaoRedirectUri();

    const kakaoAuthUrl = KAKAO_REST_API_KEY
        ? `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}&response_type=code`
        : "#";

    return (
        <Box mb={4}>
            <HStack mt={2} mb={5} w="100%">
                <Separator flex="1" />
                <Text textTransform={"uppercase"} color="fg.muted" fontSize="xs" as="b">
                    Or
                </Text>
                <Separator flex="1" />
            </HStack>
            <VStack>
                <Button
                    w="100%"
                    asChild
                >
                    <a href={githubAuthUrl}>
                        <HStack gap={2}>
                            <FaGithub />
                            <Text>Continue with GitHub</Text>
                        </HStack>
                    </a>
                </Button>
                <Button
                    w="100%"
                    colorPalette="yellow"
                    asChild
                >
                    <a href={kakaoAuthUrl}>
                        <HStack gap={2}>
                            <FaComment />
                            <Text>Continue with Kakao</Text>
                        </HStack>
                    </a>
                </Button>
            </VStack>
        </Box>
    );
}


