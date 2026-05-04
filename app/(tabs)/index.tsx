import { Redirect } from 'expo-router';
import { NotificationBell } from "@/components/NotificationBell";

export default function TabsIndex() {
  return <Redirect href="/(tabs)/drops" />;
}
