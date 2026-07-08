import { Box, Skeleton } from "@mui/material";

/** Content-shaped skeleton mirroring the overview layout: hero, 4 stat cards, 3 panels. */
export default function OverviewLoading() {
  return (
    <Box sx={{ p: 3, maxWidth: 1280, mx: "auto" }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        <Skeleton
          variant="rounded"
          sx={{ height: { xs: 120, md: 150 }, borderRadius: "16px" }}
        />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
            gap: 2,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" sx={{ height: 128, borderRadius: "12px" }} />
          ))}
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              lg: "minmax(0, 5fr) minmax(0, 4fr) minmax(0, 3fr)",
            },
            gap: 2,
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" sx={{ height: 260, borderRadius: "12px" }} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
