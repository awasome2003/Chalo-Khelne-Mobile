import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import API from '../../api/tournaments';
import { useNavigation } from '@react-navigation/native';

const LeaderboardScreen = () => {
  const navigation = useNavigation()
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API.ENDPOINTS.LEADERBOARD.ALL_TOURNAMENTS}?limit=20`);
      const data = await response.json();

      if (data.success) {
        const tournaments = data.data?.tournaments || data.tournaments || [];
        setTournaments(tournaments);
      } else {
        Alert.alert('Error', 'Failed to load tournaments');
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      Alert.alert('Error', 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleTournamentSelect = (tournament) => {
    navigation.navigate('Tournament Leaderboard', {
      tournament: tournament,
      tournamentId: tournament._id,
      tournamentName: tournament.title,
      tournamentType: tournament.type
    });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTournaments().finally(() => setRefreshing(false));
  }, []);

  // Simple Tournament Card
  const TournamentCard = ({ tournament }) => {
    const isKnockout = tournament.type?.toLowerCase().includes('knockout');

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleTournamentSelect(tournament)}
        activeOpacity={0.7}
      >
        {/* Header with Icon */}
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <MaterialIcons
              name={isKnockout ? "emoji-events" : "groups"}
              size={28}
              color="#FF6A00"
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.tournamentTitle} numberOfLines={2}>
              {tournament.title}
            </Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>
                {tournament.type?.toUpperCase() || 'TOURNAMENT'}
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#999" />
        </View>

        {/* Footer Info */}
        <View style={styles.cardFooter}>
          <View style={styles.infoItem}>
            <MaterialIcons name="people" size={16} color="#666" />
            <Text style={styles.infoText}>
              {tournament.metadata?.totalParticipants || 0} {isKnockout ? 'Teams' : 'Players'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Empty State
  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="emoji-events" size={64} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>No Tournaments</Text>
      <Text style={styles.emptyText}>
        No tournaments available at the moment
      </Text>
    </View>
  );

  if (loading && tournaments.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6A00" />
        <Text style={styles.loadingText}>Loading tournaments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tournament List */}
      <View style={styles.listWrapper}>
        {tournaments.length > 0 ? (
          tournaments.map((tournament, index) => (
            <TournamentCard key={tournament._id || index} tournament={tournament} />
          ))
        ) : (
          <EmptyState />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  container: {
    flex: 1,
  },
  listWrapper: {
    paddingVertical: 10,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF5E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  tournamentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  typeBadge: {
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF6A00',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});

export default LeaderboardScreen;