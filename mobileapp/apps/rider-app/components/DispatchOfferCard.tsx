import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DispatchOffer } from '../../customer-app/services/dispatchService';

type CardVariant = 'full' | 'compact';

interface DispatchOfferCardProps {
  offer: DispatchOffer;
  onAccept: () => void;
  onReject: () => void;
  accepting: boolean;
  rejecting: boolean;
  variant?: CardVariant;
  onExpired?: () => void;
}

const DEFAULT_TIMEOUT = 30;

const DispatchOfferCard: React.FC<DispatchOfferCardProps> = ({
  offer,
  onAccept,
  onReject,
  accepting,
  rejecting,
  variant = 'full',
  onExpired,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(
    offer.timeout_seconds || DEFAULT_TIMEOUT
  );
  const [showDetails, setShowDetails] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setTimeRemaining(offer.timeout_seconds || DEFAULT_TIMEOUT);
    setShowDetails(false);
  }, [offer]);

  useEffect(() => {
    if (timeRemaining <= 10 && timeRemaining > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [timeRemaining, pulseAnim]);

  useEffect(() => {
    setTimeRemaining(offer.timeout_seconds || DEFAULT_TIMEOUT);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpired?.();
          onReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [offer, onReject, onExpired]);

  useEffect(() => {
    if (variant === 'compact') {
      Vibration.vibrate([0, 200, 100, 200]);
    }
  }, [variant]);

  const wrapperStyles = useMemo(() => {
    if (variant === 'compact') {
      return [styles.card, styles.compactCard];
    }
    return [styles.card, styles.fullCard];
  }, [variant]);

  const actionButtonBase = variant === 'compact' ? styles.compactAction : styles.fullAction;

  return (
    <View style={wrapperStyles}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="flash" size={24} color="#FFD700" />
          <Text style={styles.headerTitle}>New Delivery!</Text>
        </View>
        <Animated.View
          style={[
            styles.timerContainer,
            timeRemaining <= 10 && styles.timerWarning,
            timeRemaining <= 10 && { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Text style={styles.timerText}>{timeRemaining}s</Text>
        </Animated.View>
      </View>

      <View style={styles.earningsSection}>
        <Text style={styles.earningsLabel}>You'll Earn</Text>
        <Text style={styles.earningsAmount}>₱{offer.total_earnings.toFixed(2)}</Text>
        {offer.is_batch && (
          <View style={styles.badge}>
            <Ionicons name="layers" size={16} color="#00BF63" />
            <Text style={styles.badgeText}>{offer.orders_count} Orders Batched</Text>
          </View>
        )}
      </View>

      <View style={styles.detailsSection}>
        {!offer.is_batch && offer.order ? (
          <>
            <View style={styles.detailRow}>
              <Ionicons name="document-text" size={18} color="#666" />
              <Text style={styles.detailLabel}>Order #</Text>
              <Text style={styles.detailValue}>{offer.order.order_number}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="storefront" size={18} color="#00BF63" />
              <Text style={styles.detailLabel}>Pickup</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {offer.order.pharmacy.name}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="location" size={18} color="#FF6B35" />
              <Text style={styles.detailLabel}>Deliver to</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {offer.order.customer_name}
              </Text>
            </View>
            {offer.pickup_distance_km !== null && (
              <View style={styles.detailRow}>
                <Ionicons name="navigate" size={18} color="#666" />
                <Text style={styles.detailLabel}>Distance</Text>
                <Text style={styles.detailValue}>
                  {offer.pickup_distance_km.toFixed(1)} km away
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.detailRow}>
              <Ionicons name="layers" size={18} color="#00BF63" />
              <Text style={styles.detailLabel}>Orders</Text>
              <Text style={styles.detailValue}>{offer.orders_count} orders</Text>
            </View>
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() => setShowDetails((prev) => !prev)}
            >
              <Text style={styles.viewDetailsText}>
                {showDetails ? 'Hide Details' : 'View All Orders'}
              </Text>
              <Ionicons
                name={showDetails ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#00BF63"
              />
            </TouchableOpacity>
            {showDetails && offer.orders && (
              <View style={styles.batchList}>
                {offer.orders.map((order, index) => (
                  <View key={index} style={styles.batchItem}>
                    <Text style={styles.batchTitle}>
                      {index + 1}. {order.order_number}
                    </Text>
                    <Text style={styles.batchDetail}>📦 {order.pharmacy_name}</Text>
                    <Text style={styles.batchDetail}>📍 {order.customer_name}</Text>
                    <Text style={styles.batchEarnings}>₱{order.earnings.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            actionButtonBase,
            styles.rejectButton,
            rejecting && styles.buttonDisabled,
          ]}
          onPress={onReject}
          disabled={accepting || rejecting}
        >
          <Ionicons name="close-circle" size={20} color="#FF3B30" />
          <Text style={styles.rejectText}>
            {rejecting ? 'Declining...' : 'Decline'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            actionButtonBase,
            styles.acceptButton,
            accepting && styles.buttonDisabled,
          ]}
          onPress={onAccept}
          disabled={accepting || rejecting}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.acceptText}>
            {accepting ? 'Accepting...' : 'Accept'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerNote}>
        {offer.is_batch
          ? 'Accepting will assign all orders in this batch to you.'
          : 'Tap Accept to start this delivery.'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 12,
  },
  fullCard: {
    marginHorizontal: 8,
  },
  compactCard: {
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  timerContainer: {
    backgroundColor: '#00BF63',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerWarning: {
    backgroundColor: '#FF3B30',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  earningsSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  earningsLabel: {
    fontSize: 14,
    color: '#666666',
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#00BF63',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00BF63',
    marginLeft: 6,
  },
  detailsSection: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#FDFDFD',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    marginLeft: 8,
    fontSize: 13,
    color: '#666666',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'right',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00BF63',
    marginRight: 4,
  },
  batchList: {
    marginTop: 12,
    gap: 8,
  },
  batchItem: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 10,
  },
  batchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  batchDetail: {
    fontSize: 12,
    color: '#666666',
  },
  batchEarnings: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00BF63',
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  fullAction: {
    flex: 1,
    paddingVertical: 14,
  },
  compactAction: {
    flex: 1,
    paddingVertical: 10,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF3B30',
    gap: 8,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#00BF63',
    borderWidth: 2,
    borderColor: '#00BF63',
    gap: 8,
  },
  rejectText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF3B30',
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footerNote: {
    fontSize: 11,
    color: '#888888',
    textAlign: 'center',
  },
});

export default DispatchOfferCard;


