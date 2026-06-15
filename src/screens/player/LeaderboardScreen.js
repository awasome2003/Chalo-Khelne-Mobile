import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import API from '../../api/tournaments';
import { getTournamentType } from '../../utils/sportTrack';

const LeaderboardScreen = () => {
  const navigation = useNavigation();
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
        const list = data.data?.tournaments || data.tournaments || [];
        setTournaments(list);
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
      tournament,
      tournamentId: tournament._id,
      tournamentName: tournament.title,
      tournamentType: getTournamentType(tournament),
    });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTournaments().finally(() => setRefreshing(false));
  }, []);

  const TournamentCard = ({ tournament }) => {
    const tournamentType = getTournamentType(tournament);
    const isKnockout = tournamentType?.toLowerCase().includes('knockout');
    const participants = tournament.metadata?.totalParticipants || 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleTournamentSelect(tournament)}
        activeOpacity={0.85}
      >
        <View style={styles.cardRow}>
          <View style={styles.iconCircle}>
            <MaterialIcons
              name={isKnockout ? 'emoji-events' : 'groups'}
              size={26}
              color="#15A765"
            />
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.tournamentTitle} numberOfLines={2}>
              {tournament.title}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>
                  {(tournamentType || 'TOURNAMENT').toUpperCase()}
                </Text>
              </View>
              <View style={styles.metaDot} />
              <Ionicons name="people-outline" size={13} color="#6B7280" />
              <Text style={styles.metaText}>
                {participants} {isKnockout ? 'Teams' : 'Players'}
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="trophy-outline" size={48} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>No Tournaments Yet</Text>
      <Text style={styles.emptyText}>
        Check back soon for live leaderboards{'\n'}and tournament standings.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && tournaments.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#15A765" />
          <Text style={styles.loadingText}>Loading tournaments...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#15A765']}
              tintColor="#15A765"
            />
          }
        >
          {tournaments.length > 0 ? (
            tournaments.map((t, i) => (
              <TournamentCard key={t._id || i} tournament={t} />
            ))
          ) : (
            <EmptyState />
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#F8F9FB',
  },

  scrollContent: {
    // paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEF1FA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
  },
  tournamentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15A765',
    letterSpacing: 0.4,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 2,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },

  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
});

export default LeaderboardScreen;
