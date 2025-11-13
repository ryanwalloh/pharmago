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
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [offer, onReject, onExpired]);

  useEffect(() => {
    if (timeRemaining === 0 && (accepting || rejecting)) {
      return;
    }
    if (timeRemaining === 0) {
      onExpired?.();
      onReject();
    }
  }, [timeRemaining, onExpired, onReject, accepting, rejecting]);

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

  const singleOrder = !offer.is_batch && offer.order ? offer.order : null;
  const pickupName = singleOrder?.pharmacy?.name || 'Unknown Pharmacy';
  const pickupAddress = singleOrder?.pharmacy?.address || '';
  const customerName = singleOrder?.customer_name || 'Customer';
  const customerAddress = singleOrder?.delivery_address || '';

  return (
    <View style={wrapperStyles}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Assignment Offer!</Text>
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
        <Text style={styles.earningsLabel}>You&apos;ll Earn</Text>
        <Text style={styles.earningsAmount}>₱{offer.total_earnings.toFixed(2)}</Text>
        {offer.is_batch && (
          <View style={styles.badge}>
            <Ionicons name="layers" size={16} color="#00BF63" />
            <Text style={styles.badgeText}>{offer.orders_count} Orders Batched</Text>
          </View>
        )}
      </View>

      <View style={styles.detailsSection}>
        {singleOrder ? (
          <>
            <View style={styles.detailRow}>
              <Ionicons name="document-text" size={18} color="#666" style={styles.detailIcon} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Order #</Text>
                <Text style={styles.detailValue}>{singleOrder.order_number}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="storefront" size={18} color="#00BF63" style={styles.detailIcon} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Pickup</Text>
                <Text style={styles.detailValue}>{pickupName}</Text>
                {pickupAddress ? (
                  <Text style={styles.detailSubValue}>{pickupAddress}</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="location" size={18} color="#FF6B35" style={styles.detailIcon} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Deliver to</Text>
                <Text style={styles.detailValue}>{customerName}</Text>
                {customerAddress ? (
                  <Text style={styles.detailSubValue}>{customerAddress}</Text>
                ) : null}
              </View>
            </View>
            {offer.pickup_distance_km !== null && (
              <View style={styles.detailRow}>
                <Ionicons name="navigate" size={18} color="#666" style={styles.detailIcon} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Pickup Distance</Text>
                  <Text style={styles.detailValue}>
                    {offer.pickup_distance_km.toFixed(1)} km away
                  </Text>
                </View>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.detailRow}>
              <Ionicons name="layers" size={18} color="#00BF63" style={styles.detailIcon} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Orders in batch</Text>
                <Text style={styles.detailValue}>{offer.orders_count} orders</Text>
              </View>
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
                {offer.orders.map((order, index) => {
                  const pharmacyName = order.pharmacy?.name ?? order.pharmacy_name ?? 'Unknown Pharmacy';
                  const pharmacyAddress =
                    order.pharmacy?.address ?? order.pharmacy_address ?? '';
                  const deliveryAddress = order.delivery_address ?? '';
                  const customerLabel = order.customer_name || 'Customer';

                  return (
                    <View key={index} style={styles.batchItem}>
                      <Text style={styles.batchTitle}>
                        {index + 1}. {order.order_number}
                      </Text>
                      <Text style={styles.batchDetailLine}>🏥 {pharmacyName}</Text>
                      {pharmacyAddress ? (
                        <Text style={styles.batchDetailSub}>{pharmacyAddress}</Text>
                      ) : null}
                      <Text style={styles.batchDetailLine}>👤 {customerLabel}</Text>
                      {deliveryAddress ? (
                        <Text style={styles.batchDetailSub}>{deliveryAddress}</Text>
                      ) : null}
                      <Text style={styles.batchEarnings}>₱{order.earnings.toFixed(2)}</Text>
                    </View>
                  );
                })}
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
    alignSelf: 'center',
    width: '92%',
    maxWidth: 420,
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 4,
  },
  detailSubValue: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
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
  batchDetailLine: {
    fontSize: 12,
    color: '#666666',
  },
  batchDetailSub: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
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


