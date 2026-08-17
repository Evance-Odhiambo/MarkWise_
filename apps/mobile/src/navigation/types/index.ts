import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  AppEntry: undefined;
  StudentApp: NavigatorScreenParams<StudentTabParamList> | undefined;
  LecturerApp: NavigatorScreenParams<LecturerTabParamList> | undefined;
};

export type NotificationStackParamList = {
  NotificationList: undefined;
  NotificationDetail: { notificationId: string };
};

export type AttendanceStackParamList = {
  AttendanceMode: undefined;
  TakeInPerson: { method?: 'qr' | 'ble' | 'pin' };
  MarkInPerson: { sessionId: string };
  TakeOnline: { method?: 'qr' | 'ble' | 'pin' };
  MarkOnline: { sessionId: string };
};

export type StudentTabParamList = {
  Home: undefined;
  Settings: undefined;
  Notifications: NavigatorScreenParams<NotificationStackParamList> | undefined;
  Attendance: NavigatorScreenParams<AttendanceStackParamList> | undefined;
};

export type LecturerTabParamList = {
  Home: undefined;
  Settings: undefined;
  Notifications: NavigatorScreenParams<NotificationStackParamList> | undefined;
  Attendance: NavigatorScreenParams<AttendanceStackParamList> | undefined;
};
