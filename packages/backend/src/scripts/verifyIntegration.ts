#!/usr/bin/env ts-node

/**
 * Integration Verification Script
 * 
 * This script verifies that all system components are properly integrated
 * and can communicate with each other.
 */

import { bleIntegrationService } from '../services/bleIntegrationService';
import { CrowdMonitoringService } from '../services/crowdMonitoringService';
import { dashboardService } from '../services/dashboardService';
import { systemIntegrationService } from '../services/systemIntegrationService';

interface VerificationResult {
  component: string;
  status: 'pass' | 'fail';
  message: string;
  details?: any;
}

class IntegrationVerifier {
  private results: VerificationResult[] = [];

  async runVerification(): Promise<void> {
    console.log('🔧 Starting System Integration Verification...\n');

    try {
      // Test 1: System Integration Service Initialization
      await this.testSystemIntegrationService();

      // Test 2: BLE Integration Service
      await this.testBLEIntegrationService();

      // Test 3: Dashboard Service Integration
      await this.testDashboardServiceIntegration();

      // Test 4: Crowd Monitoring Integration
      await this.testCrowdMonitoringIntegration();

      // Test 5: Cross-Service Communication
      await this.testCrossServiceCommunication();

      // Test 6: Real-time Features
      await this.testRealTimeFeatures();

      // Test 7: Error Handling
      await this.testErrorHandling();

      // Print Results
      this.printResults();

    } catch (error) {
      console.error('❌ Verification failed with error:', error);
      process.exit(1);
    }
  }

  private async testSystemIntegrationService(): Promise<void> {
    try {
      console.log('Testing System Integration Service...');
      
      await systemIntegrationService.initialize();
      const stats = systemIntegrationService.getIntegrationStats();
      const health = await systemIntegrationService.performSystemHealthCheck();

      this.addResult({
        component: 'System Integration Service',
        status: 'pass',
        message: 'Successfully initialized and providing stats',
        details: {
          statsAvailable: !!stats,
          healthChecksCount: health.size,
          integrationStatsKeys: Object.keys(stats)
        }
      });

    } catch (error) {
      this.addResult({
        component: 'System Integration Service',
        status: 'fail',
        message: `Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  private async testBLEIntegrationService(): Promise<void> {
    try {
      console.log('Testing BLE Integration Service...');
      
      await bleIntegrationService.initialize();
      const stats = bleIntegrationService.getIntegrationStats();

      this.addResult({
        component: 'BLE Integration Service',
        status: 'pass',
        message: 'Successfully initialized and providing integration stats',
        details: {
          isInitialized: stats.isInitialized,
          statsAvailable: !!stats
        }
      });

    } catch (error) {
      this.addResult({
        component: 'BLE Integration Service',
        status: 'fail',
        message: `Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  private async testDashboardServiceIntegration(): Promise<void> {
    try {
      console.log('Testing Dashboard Service Integration...');
      
      const metrics = await dashboardService.getDashboardMetrics();
      const notifications = await dashboardService.getNotifications();

      this.addResult({
        component: 'Dashboard Service Integration',
        status: 'pass',
        message: 'Successfully providing metrics and notifications',
        details: {
          metricsKeys: Object.keys(metrics),
          notificationsCount: notifications.notifications.length,
          unreadCount: notifications.unreadCount
        }
      });

    } catch (error) {
      this.addResult({
        component: 'Dashboard Service Integration',
        status: 'fail',
        message: `Failed to get dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  private async testCrowdMonitoringIntegration(): Promise<void> {
    try {
      console.log('Testing Crowd Monitoring Integration...');
      
      const crowdService = new CrowdMonitoringService();
      const overview = await crowdService.getCampusOverview();
      const alerts = await crowdService.getCrowdAlerts();

      this.addResult({
        component: 'Crowd Monitoring Integration',
        status: 'pass',
        message: 'Successfully providing crowd data and alerts',
        details: {
          overviewKeys: Object.keys(overview),
          alertsCount: alerts.length,
          totalLocations: overview.totalLocations
        }
      });

    } catch (error) {
      this.addResult({
        component: 'Crowd Monitoring Integration',
        status: 'fail',
        message: `Failed to get crowd data: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  private async testCrossServiceCommunication(): Promise<void> {
    try {
      console.log('Testing Cross-Service Communication...');
      
      // Test event emission and listening
      let eventReceived = false;
      
      systemIntegrationService.on('testEvent', () => {
        eventReceived = true;
      });

      systemIntegrationService.emit('testEvent');

      // Give it a moment to process
      await new Promise(resolve => setTimeout(resolve, 100));

      this.addResult({
        component: 'Cross-Service Communication',
        status: eventReceived ? 'pass' : 'fail',
        message: eventReceived 
          ? 'Event system working correctly'
          : 'Event system not working properly',
        details: {
          eventReceived,
          listenerCount: systemIntegrationService.listenerCount('testEvent')
        }
      });

    } catch (error) {
      this.addResult({
        component: 'Cross-Service Communication',
        status: 'fail',
        message: `Failed to test events: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  private async testRealTimeFeatures(): Promise<void> {
    try {
      console.log('Testing Real-time Features...');
      
      // Test that real-time data can be retrieved
      const realTimeData = await bleIntegrationService.getRealTimeCrowdData();
      
      this.addResult({
        component: 'Real-time Features',
        status: 'pass',
        message: 'Real-time data retrieval working',
        details: {
          realTimeDataKeys: Object.keys(realTimeData),
          timestamp: realTimeData.timestamp
        }
      });

    } catch (error) {
      this.addResult({
        component: 'Real-time Features',
        status: 'fail',
        message: `Failed to get real-time data: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  private async testErrorHandling(): Promise<void> {
    try {
      console.log('Testing Error Handling...');
      
      // Test that services handle errors gracefully
      let errorHandled = false;
      
      try {
        // This should trigger error handling
        await systemIntegrationService.testUserWorkflow('invalid-role' as any);
      } catch (error) {
        errorHandled = true;
      }

      this.addResult({
        component: 'Error Handling',
        status: errorHandled ? 'pass' : 'fail',
        message: errorHandled 
          ? 'Error handling working correctly'
          : 'Error handling not working properly',
        details: {
          errorHandled
        }
      });

    } catch (error) {
      this.addResult({
        component: 'Error Handling',
        status: 'fail',
        message: `Failed to test error handling: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  private addResult(result: VerificationResult): void {
    this.results.push(result);
  }

  private printResults(): void {
    console.log('\n📊 Integration Verification Results:\n');
    console.log('='.repeat(80));

    let passCount = 0;
    let failCount = 0;

    this.results.forEach((result, index) => {
      const status = result.status === 'pass' ? '✅ PASS' : '❌ FAIL';
      const number = (index + 1).toString().padStart(2, '0');
      
      console.log(`${number}. ${result.component}: ${status}`);
      console.log(`    ${result.message}`);
      
      if (result.details) {
        console.log(`    Details: ${JSON.stringify(result.details, null, 2).replace(/\n/g, '\n    ')}`);
      }
      
      console.log('');

      if (result.status === 'pass') {
        passCount++;
      } else {
        failCount++;
      }
    });

    console.log('='.repeat(80));
    console.log(`📈 Summary: ${passCount} passed, ${failCount} failed`);
    
    if (failCount === 0) {
      console.log('🎉 All integration tests passed! System is properly integrated.');
    } else {
      console.log('⚠️  Some integration tests failed. Please review the issues above.');
    }

    console.log('='.repeat(80));
  }
}

// Run verification if this script is executed directly
if (require.main === module) {
  const verifier = new IntegrationVerifier();
  verifier.runVerification()
    .then(() => {
      console.log('\n✅ Integration verification completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Integration verification failed:', error);
      process.exit(1);
    });
}

export { IntegrationVerifier };
