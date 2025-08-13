import {
    Toaster as ChakraToaster,
    createToaster,
    ToastRoot,
    ToastIndicator,
    ToastTitle,
    ToastDescription,
    ToastCloseTrigger,
} from "@chakra-ui/react"

export const toaster = createToaster({
    placement: "bottom",
})

export function Toaster() {
    return (
        <ChakraToaster toaster={toaster}>
            {(toast) => {
                const type = (toast as any).type || "info";
                return (
                    <ToastRoot
                        maxW="400px"
                        w="100%"
                        colorPalette={type === "success" ? "green" : type === "error" ? "red" : type === "loading" ? "blue" : "gray"}
                    >
                        <ToastIndicator />
                        {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
                        {toast.description && <ToastDescription>{toast.description}</ToastDescription>}
                        <ToastCloseTrigger />
                    </ToastRoot>
                );
            }}
        </ChakraToaster>
    )
}
