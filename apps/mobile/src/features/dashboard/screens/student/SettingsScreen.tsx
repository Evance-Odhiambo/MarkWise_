import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const StudentSettingsScreen = () => {
    return (
        <SafeAreaView className="flex-1 justify-center items-center bg-emerald-100">
            <View>
                <Text>Welcome to MarkWise</Text>
                <Text> This is the student settings screen.</Text>
            </View>
        </SafeAreaView>
    );
}   

export default StudentSettingsScreen;