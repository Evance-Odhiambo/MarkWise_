import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  AppEntry: undefined;
  StudentSignIn: undefined;
  StudentSignUp: undefined;
  LecturerSignIn: undefined;
  LecturerSignUp: undefined;
  StudentApp: NavigatorScreenParams<StudentTabParamList> | undefined;
  LecturerApp: NavigatorScreenParams<LecturerTabParamList> | undefined;
  StudentUnitSelection: undefined;
  LecturerUnitSelection: undefined;
};

export type NotificationStackParamList = {
  NotificationList: undefined;
  NotificationDetail: { notificationId: string };
  NotificationBin: undefined;
};

export type AttendanceStackParamList = {
  StudentProgress: undefined;
  LecturerProgress: undefined;
  LecturerDelegation: undefined;
  StudentDelegation: undefined;
  AttendanceMode: undefined;
  StudentUnitSelection: { next?: 'MarkInPerson' | 'MarkOnline' };
  LecturerUnitSelection: { next?: 'TakeInPerson' | 'TakeOnline' };
  TakeInPerson: {
    method?: 'qr' | 'ble' | 'pin';
    unitCode?: string;
    unitName?: string;
    delegatedSessionId?: string;
  };
  MarkInPerson: { sessionId?: string; unitCode?: string; unitName?: string };
  TakeOnline: {
    method?: 'qr' | 'ble' | 'pin';
    unitCode: string;
    unitName?: string;
  };
  MarkOnline: { sessionId: string; unitCode?: string; unitName?: string };
};

export type StudentTabParamList = {
  Home: undefined;
  Settings: undefined;
  Alerts: NavigatorScreenParams<NotificationStackParamList> | undefined;
  Attendance: NavigatorScreenParams<AttendanceStackParamList> | undefined;
};

export type LecturerTabParamList = {
  Home: undefined;
  Settings: undefined;
  Alerts: NavigatorScreenParams<NotificationStackParamList> | undefined;
  Attendance: NavigatorScreenParams<AttendanceStackParamList> | undefined;
};
