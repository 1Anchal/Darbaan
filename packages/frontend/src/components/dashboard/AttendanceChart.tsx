import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import React, { useEffect, useRef } from 'react';

interface AttendanceChartProps {
  data: {
    present: number;
    late: number;
    absent: number;
  };
  title?: string;
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({ 
  data, 
  title = "Today's Attendance Distribution" 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();

  const colors = {
    present: theme.palette.success.main,
    late: theme.palette.warning.main,
    absent: theme.palette.error.main,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const size = 200;
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    const total = data.present + data.late + data.absent;
    if (total === 0) {
      // Draw empty state
      ctx.strokeStyle = theme.palette.divider;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 20, 0, 2 * Math.PI);
      ctx.stroke();
      
      ctx.fillStyle = theme.palette.text.secondary;
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No Data', size / 2, size / 2);
      return;
    }

    // Calculate angles
    const presentAngle = (data.present / total) * 2 * Math.PI;
    const lateAngle = (data.late / total) * 2 * Math.PI;
    const absentAngle = (data.absent / total) * 2 * Math.PI;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 20;

    let currentAngle = -Math.PI / 2; // Start from top

    // Draw present slice
    if (data.present > 0) {
      ctx.fillStyle = colors.present;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + presentAngle);
      ctx.closePath();
      ctx.fill();
      currentAngle += presentAngle;
    }

    // Draw late slice
    if (data.late > 0) {
      ctx.fillStyle = colors.late;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + lateAngle);
      ctx.closePath();
      ctx.fill();
      currentAngle += lateAngle;
    }

    // Draw absent slice
    if (data.absent > 0) {
      ctx.fillStyle = colors.absent;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + absentAngle);
      ctx.closePath();
      ctx.fill();
    }

    // Draw center circle for donut effect
    ctx.fillStyle = theme.palette.background.paper;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
    ctx.fill();

    // Draw total in center
    ctx.fillStyle = theme.palette.text.primary;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(total.toString(), centerX, centerY - 5);
    
    ctx.font = '12px Arial';
    ctx.fillStyle = theme.palette.text.secondary;
    ctx.fillText('Total', centerX, centerY + 15);

  }, [data, theme]);

  const total = data.present + data.late + data.absent;
  const getPercentage = (value: number) => total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <canvas ref={canvasRef} style={{ maxWidth: '200px', maxHeight: '200px' }} />
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    backgroundColor: colors.present,
                    borderRadius: '50%'
                  }}
                />
                <Typography variant="body2">Present</Typography>
              </Box>
              <Typography variant="h6" sx={{ ml: 2 }}>
                {data.present} ({getPercentage(data.present)}%)
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    backgroundColor: colors.late,
                    borderRadius: '50%'
                  }}
                />
                <Typography variant="body2">Late</Typography>
              </Box>
              <Typography variant="h6" sx={{ ml: 2 }}>
                {data.late} ({getPercentage(data.late)}%)
              </Typography>
            </Box>

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    backgroundColor: colors.absent,
                    borderRadius: '50%'
                  }}
                />
                <Typography variant="body2">Absent</Typography>
              </Box>
              <Typography variant="h6" sx={{ ml: 2 }}>
                {data.absent} ({getPercentage(data.absent)}%)
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AttendanceChart;