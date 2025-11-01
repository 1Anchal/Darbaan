import { PrismaClient } from '@prisma/client';
import { SettingsCategory, SystemSettings } from '../types';

const prisma = new PrismaClient();

export class SettingsService {
  // Get settings by category
  async getSettingsByCategory(category: SettingsCategory): Promise<SystemSettings | null> {
    try {
      const settings = await prisma.systemSettings.findUnique({
        where: { category: category as any }
      });

      if (!settings) {
        return null;
      }

      return this.mapPrismaToSystemSettings(settings);
    } catch (error) {
      console.error('Error fetching settings by category:', error);
      throw new Error('Failed to fetch settings');
    }
  }

  // Get all settings
  async getAllSettings(): Promise<SystemSettings[]> {
    try {
      const settings = await prisma.systemSettings.findMany({
        orderBy: { category: 'asc' }
      });

      return settings.map((setting: any) => this.mapPrismaToSystemSettings(setting));
    } catch (error) {
      console.error('Error fetching all settings:', error);
      throw new Error('Failed to fetch settings');
    }
  }

  // Update settings by category
  async updateSettingsByCategory(
    category: SettingsCategory,
    updates: Partial<SystemSettings>,
    updatedBy: string
  ): Promise<SystemSettings> {
    try {
      const updateData: any = {
        updatedBy,
        updatedAt: new Date()
      };

      // Map updates based on category
      switch (category) {
        case SettingsCategory.GENERAL:
          if (updates.systemName !== undefined) updateData.systemName = updates.systemName;
          if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
          if (updates.language !== undefined) updateData.language = updates.language;
          if (updates.dateFormat !== undefined) updateData.dateFormat = updates.dateFormat;
          if (updates.enableBackups !== undefined) updateData.enableBackups = updates.enableBackups;
          break;

        case SettingsCategory.ATTENDANCE:
          if (updates.lateThresholdMins !== undefined) updateData.lateThresholdMins = updates.lateThresholdMins;
          if (updates.absentThresholdMins !== undefined) updateData.absentThresholdMins = updates.absentThresholdMins;
          if (updates.cooldownPeriodSecs !== undefined) updateData.cooldownPeriodSecs = updates.cooldownPeriodSecs;
          if (updates.enableManualEntry !== undefined) updateData.enableManualEntry = updates.enableManualEntry;
          break;

        case SettingsCategory.NOTIFICATIONS:
          if (updates.emailNotifications !== undefined) updateData.emailNotifications = updates.emailNotifications;
          if (updates.smsNotifications !== undefined) updateData.smsNotifications = updates.smsNotifications;
          if (updates.pushNotifications !== undefined) updateData.pushNotifications = updates.pushNotifications;
          if (updates.dailyReports !== undefined) updateData.dailyReports = updates.dailyReports;
          if (updates.securityAlerts !== undefined) updateData.securityAlerts = updates.securityAlerts;
          break;

        case SettingsCategory.SECURITY:
          if (updates.sessionTimeoutMins !== undefined) updateData.sessionTimeoutMins = updates.sessionTimeoutMins;
          if (updates.passwordExpiryDays !== undefined) updateData.passwordExpiryDays = updates.passwordExpiryDays;
          if (updates.twoFactorAuth !== undefined) updateData.twoFactorAuth = updates.twoFactorAuth;
          if (updates.dataEncryption !== undefined) updateData.dataEncryption = updates.dataEncryption;
          if (updates.auditLogs !== undefined) updateData.auditLogs = updates.auditLogs;
          break;

        case SettingsCategory.SYSTEM:
          if (updates.syncIntervalMins !== undefined) updateData.syncIntervalMins = updates.syncIntervalMins;
          if (updates.logLevel !== undefined) updateData.logLevel = updates.logLevel as any;
          if (updates.autoSync !== undefined) updateData.autoSync = updates.autoSync;
          if (updates.offlineMode !== undefined) updateData.offlineMode = updates.offlineMode;
          if (updates.debugMode !== undefined) updateData.debugMode = updates.debugMode;
          break;

        default:
          throw new Error('Invalid settings category');
      }

      const updatedSettings = await prisma.systemSettings.upsert({
        where: { category: category as any },
        update: updateData,
        create: {
          category: category as any,
          ...updateData
        }
      });

      return this.mapPrismaToSystemSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw new Error('Failed to update settings');
    }
  }

  // Initialize default settings for all categories
  async initializeDefaultSettings(updatedBy: string): Promise<void> {
    try {
      const categories = Object.values(SettingsCategory);
      
      for (const category of categories) {
        const existingSettings = await prisma.systemSettings.findUnique({
          where: { category: category as any }
        });

        if (!existingSettings) {
          await this.createDefaultSettingsForCategory(category, updatedBy);
        }
      }
    } catch (error) {
      console.error('Error initializing default settings:', error);
      throw new Error('Failed to initialize default settings');
    }
  }

  // Create default settings for a specific category
  private async createDefaultSettingsForCategory(category: SettingsCategory, updatedBy: string): Promise<void> {
    const defaultData: any = {
      category: category as any,
      updatedBy,
      updatedAt: new Date()
    };

    switch (category) {
      case SettingsCategory.GENERAL:
        defaultData.systemName = 'Darbaan Attendance System';
        defaultData.timezone = 'UTC';
        defaultData.language = 'en';
        defaultData.dateFormat = 'YYYY-MM-DD';
        defaultData.enableBackups = true;
        break;

      case SettingsCategory.ATTENDANCE:
        defaultData.lateThresholdMins = 15;
        defaultData.absentThresholdMins = 60;
        defaultData.cooldownPeriodSecs = 300;
        defaultData.enableManualEntry = false;
        break;

      case SettingsCategory.NOTIFICATIONS:
        defaultData.emailNotifications = true;
        defaultData.smsNotifications = false;
        defaultData.pushNotifications = true;
        defaultData.dailyReports = true;
        defaultData.securityAlerts = true;
        break;

      case SettingsCategory.SECURITY:
        defaultData.sessionTimeoutMins = 60;
        defaultData.passwordExpiryDays = 90;
        defaultData.twoFactorAuth = false;
        defaultData.dataEncryption = true;
        defaultData.auditLogs = true;
        break;

      case SettingsCategory.SYSTEM:
        defaultData.syncIntervalMins = 5;
        defaultData.logLevel = 'INFO';
        defaultData.autoSync = true;
        defaultData.offlineMode = false;
        defaultData.debugMode = false;
        break;
    }

    await prisma.systemSettings.create({ data: defaultData });
  }

  // Helper method to map Prisma model to SystemSettings interface
  private mapPrismaToSystemSettings(prismaSettings: any): SystemSettings {
    return {
      id: prismaSettings.id,
      category: prismaSettings.category as SettingsCategory,
      systemName: prismaSettings.systemName,
      timezone: prismaSettings.timezone,
      language: prismaSettings.language,
      dateFormat: prismaSettings.dateFormat,
      enableBackups: prismaSettings.enableBackups,
      lateThresholdMins: prismaSettings.lateThresholdMins,
      absentThresholdMins: prismaSettings.absentThresholdMins,
      cooldownPeriodSecs: prismaSettings.cooldownPeriodSecs,
      enableManualEntry: prismaSettings.enableManualEntry,
      emailNotifications: prismaSettings.emailNotifications,
      smsNotifications: prismaSettings.smsNotifications,
      pushNotifications: prismaSettings.pushNotifications,
      dailyReports: prismaSettings.dailyReports,
      securityAlerts: prismaSettings.securityAlerts,
      sessionTimeoutMins: prismaSettings.sessionTimeoutMins,
      passwordExpiryDays: prismaSettings.passwordExpiryDays,
      twoFactorAuth: prismaSettings.twoFactorAuth,
      dataEncryption: prismaSettings.dataEncryption,
      auditLogs: prismaSettings.auditLogs,
      syncIntervalMins: prismaSettings.syncIntervalMins,
      logLevel: prismaSettings.logLevel,
      autoSync: prismaSettings.autoSync,
      offlineMode: prismaSettings.offlineMode,
      debugMode: prismaSettings.debugMode,
      updatedBy: prismaSettings.updatedBy,
      updatedAt: prismaSettings.updatedAt
    };
  }
}

export const settingsService = new SettingsService();