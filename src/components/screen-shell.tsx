import { usePathname, useRouter } from 'expo-router';
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { exportTradesToExcel } from '@/utils/trade-export';

type DrawerContextValue = {
  drawerOpen: boolean;
  setDrawerOpen: (value: boolean) => void;
};

const DrawerContext = createContext<DrawerContextValue | undefined>(undefined);

export const DrawerProvider = ({ children }: { children: ReactNode }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const value = useMemo(() => ({ drawerOpen, setDrawerOpen }), [drawerOpen]);

  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>;
};

export const useDrawer = () => {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error('useDrawer must be used within DrawerProvider');
  }
  return context;
};

const navItems = [
  { label: 'Home', route: '/' },
  { label: 'Add Trade', route: '/add-trade' },
  { label: 'Trading Calendar', route: '/calendar' },
  { label: 'Performance & Statistics', route: '/performance' },
  { label: '📊 Export to Excel', route: '__EXPORT__' },
  { label: 'Settings', route: '/settings' },
];

export function ScreenShell({
  title,
  children,
  rightContent,
}: {
  title: string;
  children: ReactNode;
  rightContent?: ReactNode;
}) {
  const { drawerOpen, setDrawerOpen } = useDrawer();
  const router = useRouter();
  const pathname = usePathname();
  const [isExporting, setIsExporting] = useState(false);

  const handleNavigate = (route: string) => {
    setDrawerOpen(false);
    if (pathname !== route) {
      router.push(route as any);
    }
  };

  const handleExport = async () => {
    if (isExporting) return;

    setDrawerOpen(false);
    setIsExporting(true);

    try {
      const { fileName } = await exportTradesToExcel();
      Alert.alert('Export complete', `Your Excel workbook was saved as ${fileName}.`, [
        { text: 'OK' },
      ]);
    } catch (error) {
      Alert.alert('Export failed', 'Could not create the Excel workbook. Please try again.');
      console.error('Excel export failed', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setDrawerOpen(true)}
            style={styles.iconButton}
          >
            <Text style={styles.iconText}>☰</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{title}</Text>

          <View style={styles.rightSlot}>{rightContent ?? <View style={styles.placeholder} />}</View>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={drawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDrawerOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setDrawerOpen(false)} />
        <View style={styles.drawer}>
          <Text style={styles.drawerTitle}>Trade Journal</Text>

          {navItems.map((item) => {
            const active = pathname === item.route;
            const isExportItem = item.route === '__EXPORT__';
            return (
              <Pressable
                key={item.route}
                disabled={isExporting && isExportItem}
                onPress={() => {
                  if (isExportItem) {
                    void handleExport();
                    return;
                  }
                  handleNavigate(item.route);
                }}
                style={[
                  styles.drawerItem,
                  active && styles.drawerItemActive,
                  isExporting && isExportItem && styles.drawerItemDisabled,
                ]}
              >
                <Text style={[styles.drawerLabel, active && styles.drawerLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09111a',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#172334',
    backgroundColor: '#0d1723',
  },
  headerTitle: {
    flex: 1,
    color: '#edf2ff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#142230',
    borderWidth: 1,
    borderColor: '#263547',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#edf2ff',
    fontSize: 18,
    fontWeight: '700',
  },
  rightSlot: {
    width: 38,
    alignItems: 'flex-end',
  },
  placeholder: {
    width: 18,
    height: 18,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2, 6, 12, 0.64)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '78%',
    maxWidth: 340,
    backgroundColor: '#0f1723',
    borderRightWidth: 1,
    borderRightColor: '#223246',
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  drawerTitle: {
    color: '#f3f7ff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
  },
  drawerItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#111d2d',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  drawerItemActive: {
    backgroundColor: '#122b36',
    borderColor: '#1dbf73',
  },
  drawerItemDisabled: {
    opacity: 0.6,
  },
  drawerLabel: {
    color: '#dfe9fc',
    fontSize: 15,
    fontWeight: '600',
  },
  drawerLabelActive: {
    color: '#6ee7a0',
  },
});
