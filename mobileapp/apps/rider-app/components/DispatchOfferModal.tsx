/**
 * Dispatch Offer Modal
 * Full-screen modal that appears when rider receives a dispatch offer
 * Features: 30s countdown, accept/reject, batch details, earnings-focused design
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Vibration,
  Alert,
} from 'react-native';
import { DispatchOffer } from '../../customer-app/services/dispatchService';
import DispatchOfferCard from './DispatchOfferCard';

// ✅ FIX: Lazy dimensions to prevent import-time crashes
let cachedHeight: number | null = null;

const getScreenHeight = (): number => {
  if (cachedHeight === null) {
    cachedHeight = Dimensions.get('window').height;
  }
  return cachedHeight;
};

interface DispatchOfferModalProps {
  visible: boolean;
  offer: DispatchOffer | null;
  onAccept: () => void;
  onReject: () => void;
  accepting: boolean;
  rejecting: boolean;
}

export default function DispatchOfferModal({
  visible,
  offer,
  onAccept,
  onReject,
  accepting,
  rejecting,
}: DispatchOfferModalProps) {
  const [timeRemaining, setTimeRemaining] = useState(30);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(getScreenHeight())).current;

  // Countdown timer
  useEffect(() => {
    if (!visible || !offer) {
      setTimeRemaining(30);
      return;
    }

    setTimeRemaining(offer.timeout_seconds || 30);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          Alert.alert('Offer Expired', 'You did not respond in time.');
          onReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, offer, onReject]);

  useEffect(() => {
    if (timeRemaining <= 10 && timeRemaining > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [timeRemaining]);

  useEffect(() => {
    if (visible) {
      Vibration.vibrate([0, 200, 100, 200]);

      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: getScreenHeight(),
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!offer) return null;

  const isBatch = offer.is_batch;
  const ordersCount = offer.orders_count;
  const earnings = offer.total_earnings;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={() => {}}
    >
      <Animated.View
        style={[
          styles.modalContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <DispatchOfferCard
          offer={offer}
          onAccept={onAccept}
          onReject={onReject}
          accepting={accepting}
          rejecting={rejecting}
          variant="full"
        />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 10,
  },
  timerContainer: {
    backgroundColor: '#00BF63',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerWarning: {
    backgroundColor: '#FF3B30',
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  earningsSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    marginBottom: 20,
  },
  earningsLabel: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: '#00BF63',
  },
  batchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  batchBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00BF63',
    marginLeft: 6,
  },
  detailsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 10,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 2,
    textAlign: 'right',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00BF63',
    marginRight: 6,
  },
  batchDetailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  batchOrderItem: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  batchOrderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  batchOrderDetail: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  batchOrderEarnings: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00BF63',
    marginTop: 6,
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF3B30',
    marginLeft: 8,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00BF63',
    paddingVertical: 16,
    borderRadius: 12,
    marginLeft: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  footerNote: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

