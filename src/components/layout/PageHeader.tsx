import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
  title: string;
  description?: string;
}

export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 'bold',
          color: 'text.primary',
          mb: 1,
          transition: 'color 0.15s ease',
        }}
      >
        {title}
      </Typography>
      {description && (
        <Typography
          variant="body1"
          sx={{
            color: 'text.secondary',
            transition: 'color 0.15s ease',
          }}
        >
          {description}
        </Typography>
      )}
    </Box>
  );
}
