import { Dialog as ChakraDialog, Portal } from "@chakra-ui/react"
import * as React from "react"

interface DialogContentProps extends React.ComponentProps<typeof ChakraDialog.Content> {
    portalled?: boolean
    portalRef?: React.RefObject<HTMLElement>
    backdrop?: boolean
}

export const DialogContent = React.forwardRef<
    HTMLDivElement,
    DialogContentProps
>(function DialogContent(props, ref) {
    const { children, portalled = true, portalRef, backdrop = true, ...rest } = props

    return (
        <Portal disabled={!portalled} container={portalRef}>
            {backdrop && <ChakraDialog.Backdrop />}
            <ChakraDialog.Positioner>
                <ChakraDialog.Content ref={ref} {...rest}>
                    {children}
                </ChakraDialog.Content>
            </ChakraDialog.Positioner>
        </Portal>
    )
})

export const DialogTrigger = ChakraDialog.Trigger
export const DialogRoot = ChakraDialog.Root
export const DialogFooter = ChakraDialog.Footer
export const DialogHeader = ChakraDialog.Header
export const DialogBody = ChakraDialog.Body
export const DialogBackdrop = ChakraDialog.Backdrop
export const DialogTitle = ChakraDialog.Title
export const DialogDescription = ChakraDialog.Description
export const DialogCloseTrigger = ChakraDialog.CloseTrigger
