import {
    Alert,
    Box,
    Card,
    CardContent,
    CircularProgress,
    Container,
    Divider,
    Grid,
    Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { ReportData, reportService } from '../../services/reportService';
import { ReportFilters } from '../../types';
import AttendanceTrends from './AttendanceTrends';
import DateRangeSelector from './DateRangeSelector';
import FilterControls from './FilterControls';
import ReportAnalytics from './ReportAnalytics';
import ReportTypeSelector from './ReportTypeSelector';

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({
    reportType: 'daily',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const handleFiltersChange = (newFilters: Partial<ReportFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await reportService.generateReport(filters);
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  // Generate initial report on component mount
  useEffect(() => {
    generateReport();
  }, []);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Reports & Analytics
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Generate comprehensive attendance reports with detailed analytics and visualizations.
      </Typography>

      {/* Filters Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Report Configuration
          </Typography>
          
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <ReportTypeSelector
                value={filters.reportType}
                onChange={(type: 'daily' | 'weekly' | 'monthly' | 'custom') => handleFiltersChange({ reportType: type })}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <DateRangeSelector
                reportType={filters.reportType}
                startDate={filters.startDate}
                endDate={filters.endDate}
                onChange={(dates) => handleFiltersChange(dates)}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FilterControls
                classId={filters.classId}
                onClassChange={(classId?: string) => handleFiltersChange({ classId })}
                onApplyFilters={generateReport}
                loading={loading}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Generating report...
          </Typography>
        </Box>
      )}

      {/* Report Content */}
      {!loading && reportData && (
        <Grid container spacing={3}>
          {/* Analytics Section */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Analytics Overview
                </Typography>
                <ReportAnalytics analytics={reportData.analytics} />
              </CardContent>
            </Card>
          </Grid>

          {/* Charts Section */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Attendance Trends
                </Typography>
                <AttendanceTrends trends={reportData.trends} />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Attendance Distribution
                </Typography>
                <AttendanceDistributionChart distribution={reportData.distribution} />
              </CardContent>
            </Card>
          </Grid>

          {/* Report Metadata */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Report Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Report Type
                    </Typography>
                    <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                      {reportData.type}
                    </Typography>
                  </Grid>
                  
                  {reportData.startDate && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        Start Date
                      </Typography>
                      <Typography variant="body1">
                        {new Date(reportData.startDate).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  )}
                  
                  {reportData.endDate && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        End Date
                      </Typography>
                      <Typography variant="body1">
                        {new Date(reportData.endDate).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  )}
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Generated At
                    </Typography>
                    <Typography variant="body1">
                      {new Date(reportData.generatedAt).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default Reports;