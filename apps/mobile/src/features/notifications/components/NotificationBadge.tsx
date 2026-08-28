import React from 'react';
import { View, Text } from 'react-native';

interface NotificationBadgeProps {
  count: number;
  show?: boolean;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  show = true,
}) => {
  if (!show || count <= 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <View className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 rounded-full bg-emerald-500 items-center justify-center">
      <Text className="text-[10px] font-bold text-white leading-tight">
        {displayCount}
      </Text>
    </View>
  );
};

export default NotificationBadge;
