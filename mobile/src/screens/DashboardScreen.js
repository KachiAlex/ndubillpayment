import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getApplicableFees } from '../api/fees';
import { getWalletBalance } from '../api/wallet';

const DashboardScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const [walletBalance, setWalletBalance] = useState(0);
  const [fees, setFees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [walletData, feesData] = await Promise.all([
        getWalletBalance(),
        getApplicableFees(),
      ]);
      setWalletBalance(Number(walletData.balance) || 0);
      setFees(feesData.fees || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Wallet Balance</Text>
        <Text style={styles.balanceText}>₦{walletBalance.toLocaleString()}</Text>
      </View>

      <Text style={styles.sectionTitle}>Applicable Fees</Text>
      {fees.length === 0 ? (
        <Text style={styles.noDataText}>No applicable fees</Text>
      ) : (
        fees.map((fee) => (
          <View key={fee.id} style={styles.feeCard}>
            <Text style={styles.feeName}>{fee.name}</Text>
            <Text style={styles.feeAmount}>₦{Number(fee.amount).toLocaleString()}</Text>
            <Text style={styles.feeSession}>{fee.academic_session}</Text>
            {!fee.is_paid && fee.remaining_balance > 0 && (
              <TouchableOpacity
                style={styles.payButton}
                onPress={() => navigation.navigate('FeePayment', { fee })}
              >
                <Text style={styles.payButtonText}>
                  Pay ₦{Number(fee.remaining_balance).toLocaleString()}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1e3a8a',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
  },
  card: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 10,
  },
  balanceText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    color: '#374151',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  noDataText: {
    textAlign: 'center',
    margin: 20,
    color: '#6b7280',
  },
  feeCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 5,
  },
  feeAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 5,
  },
  feeSession: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 10,
  },
  payButton: {
    backgroundColor: '#1e3a8a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DashboardScreen;
