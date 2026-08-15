import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, UserRole } from '../context/AuthContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { BookOpen, GraduationCap } from 'lucide-react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'AppEntry'>;

const AppEntryScreen = ({ navigation }: Props) => {
  const { setRole } = useAuth();

  const handleRoleSelect = (role: UserRole) => {
    setRole(role);
    if (role === 'student') {
       navigation.navigate('StudentApp');
     } else {
       navigation.navigate('LecturerApp');
    }
  };

  return (
    <SafeAreaView className="flex-1 justify-center items-center bg-emerald-50">
      <View className="items-center mb-10 bg-emerald-100 p-6 rounded-2xl shadow-md">
        <Text className="text-4xl font-bold text-emerald-700">MarkWise</Text>
        <Text className="text-lg text-slate-500 mt-2">
          Attendance Intelligence
        </Text>
      </View>
      <View>       
        <Text className="text-slate-600 p-4 text-center">
          Select how you want to proceed.
        </Text>
      </View>
      <View className="w-4/5 gap-4">
        <TouchableOpacity
          className="bg-emerald-600 rounded-xl py-4 flex-row items-center justify-center gap-3"
          onPress={() => handleRoleSelect('student')}
        >
          <GraduationCap color="white" size={28} />
          <Text className="text-white text-xl font-semibold">Student</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-slate-700 rounded-xl py-4 flex-row items-center justify-center gap-3"
          onPress={() => handleRoleSelect('lecturer')}
        >
          <BookOpen color="white" size={28} />
          <Text className="text-white text-xl font-semibold">Lecturer</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AppEntryScreen;
