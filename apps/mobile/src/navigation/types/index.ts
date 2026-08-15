import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  AppEntry: undefined;
  StudentApp: NavigatorScreenParams<StudentTabParamList> | undefined;
  LecturerApp: NavigatorScreenParams<LecturerTabParamList> | undefined;
};

export type StudentTabParamList = {
  Home: undefined;
  Settings: undefined;
};

export type LecturerTabParamList = {
  Home: undefined;
  Settings: undefined;
};
