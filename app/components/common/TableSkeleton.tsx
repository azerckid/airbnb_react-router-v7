import { Box, HStack, Skeleton, Table, VStack } from "@chakra-ui/react";

interface TableSkeletonProps {
    headers: string[];
    rowCount?: number;
}

export function TableSkeleton({ headers, rowCount = 5 }: TableSkeletonProps) {
    return (
        <Box borderWidth="1px" borderRadius="lg" overflow="hidden" bg="white">
            <Table.Root>
                <Table.Header>
                    <Table.Row bg="gray.50">
                        {headers.map((header, index) => (
                            <Table.ColumnHeader key={index} textAlign={index === headers.length - 1 ? "end" : "start"}>
                                {header}
                            </Table.ColumnHeader>
                        ))}
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {Array.from({ length: rowCount }).map((_, i) => (
                        <Table.Row key={i}>
                            {headers.map((_, colIndex) => (
                                <Table.Cell key={colIndex} textAlign={colIndex === headers.length - 1 ? "end" : "start"}>
                                    <Skeleton height="5" width={colIndex === 0 ? "150px" : "100px"} />
                                </Table.Cell>
                            ))}
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        </Box>
    );
}
