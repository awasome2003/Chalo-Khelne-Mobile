import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import tournamentConfig from "../../api/tournaments";

const TeamKnockouts = ({ route }) => {
  // =====================================================
  // STATE MANAGEMENT
  // =====================================================
  const { id, tournament } = route.params || {};

  // Core Data
  const [tournamentId, setTournamentId] = useState(id);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);

  // UI States
  const [activeTab, setActiveTab] = useState("teams"); // "teams" or "matches"
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal States
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);

  // Match Metadata
  const [totalRounds, setTotalRounds] = useState(0);

  // =====================================================
  // LIFECYCLE & DATA FETCHING
  // =====================================================
  useEffect(() => {
    if (tournamentId) {
      fetchAllData();
    }
  }, [tournamentId]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchTeams(), fetchMatches()]);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  // =====================================================
  // FETCH TEAMS
  // =====================================================
  const fetchTeams = async () => {
    try {
      const url = tournamentConfig.ENDPOINTS.BOOKINGS.TOURNAMENT_TEAMS(tournamentId);
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setTeams(data.bookings || []);
      } else {
        Alert.alert("Error", data.message || "Failed to load teams");
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      Alert.alert("Error", "Failed to load teams");
    }
  };

  // =====================================================
  // FETCH MATCHES
  // =====================================================
  const fetchMatches = async () => {
    try {
      const url = tournamentConfig.ENDPOINTS.TEAM_KNOCKOUT.BY_TOURNAMENT(tournamentId);
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        const fetchedMatches = data.matches || [];
        setMatches(fetchedMatches);

        // Calculate total rounds
        const maxRound = fetchedMatches.reduce(
          (max, match) => Math.max(max, match.round || 0),
          0
        );
        setTotalRounds(maxRound);
      } else {
        Alert.alert("Error", data.message || "Failed to load matches");
      }
    } catch (error) {
      console.error("Error fetching matches:", error);
      Alert.alert("Error", "Failed to load matches");
    }
  };

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================
  const getRoundName = (round) => {
    if (round === totalRounds) return "Final";
    if (round === totalRounds - 1) return "Semi-Finals";
    if (round === totalRounds - 2) return "Quarter-Finals";
    return `Round ${round}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not Scheduled";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "Not Scheduled";
    try {
      return new Date(dateString).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Invalid Time";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "IN_PROGRESS":
        return "#FF3B30";
      case "COMPLETED":
        return "#34C759";
      case "SCHEDULED":
        return "#007AFF";
      case "BYE":
        return "#FF9500";
      default:
        return "#8E8E93";
    }
  };

  // =====================================================
  // TEAM CARD COMPONENT
  // =====================================================
  const TeamCard = ({ team, index }) => (
    <TouchableOpacity
      style={styles.teamCard}
      onPress={() => {
        setSelectedTeam(team);
        setShowTeamModal(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.teamCardHeader}>
        <View style={styles.teamNumber}>
          <Text style={styles.teamNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.teamInfo}>
          <Text style={styles.teamName} numberOfLines={1}>
            {team.team?.name || "Unknown Team"}
          </Text>
          <View style={styles.teamMetaRow}>
            <MaterialIcons name="person" size={14} color="#666" />
            <Text style={styles.teamCaptain} numberOfLines={1}>
              {team.team?.captain?.name || team.team?.captain || "Unknown"}
            </Text>
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#007AFF" />
      </View>
    </TouchableOpacity>
  );

  // =====================================================
  // TEAM DETAILS MODAL
  // =====================================================
  const TeamDetailsModal = () => (
    <Modal
      visible={showTeamModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowTeamModal(false)}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          onPress={() => setShowTeamModal(false)}
          style={styles.teamcloseButtonTop}
        >
          <MaterialIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Team Details</Text>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedTeam && (
              <>
                {/* Team Name */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Team Name</Text>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="groups" size={24} color="#007AFF" />
                    <Text style={styles.detailText}>
                      {selectedTeam.team?.name || "Unknown Team"}
                    </Text>
                  </View>
                </View>

                {/* Captain */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Captain</Text>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="star" size={24} color="#FFD700" />
                    <Text style={styles.detailText}>
                      {selectedTeam.team?.captain?.name || selectedTeam.team?.captain || "Unknown"}
                    </Text>
                  </View>
                </View>

                {/* Players & Substitutes */}
                <View style={styles.twoColumnSection}>
                  {/* Players */}
                  <View style={styles.column}>
                    <Text style={styles.sectionTitle}>Players</Text>
                    {selectedTeam.team?.players?.map((player, index) => (
                      <View key={index} style={styles.playerRow}>
                        <MaterialIcons name="person" size={18} color="#666" />
                        <Text style={styles.playerText}>
                          {typeof player === 'string' ? player : player?.name || 'Unknown'}
                        </Text>
                      </View>
                    )) || <Text style={styles.noDataText}>No players</Text>}
                  </View>

                  {/* Substitutes */}
                  <View style={styles.column}>
                    <Text style={styles.sectionTitle}>Substitutes</Text>
                    {selectedTeam.team?.substitutes?.length > 0 ? (
                      selectedTeam.team.substitutes.map((sub, index) => (
                        <View key={index} style={styles.playerRow}>
                          <MaterialIcons name="sync" size={18} color="#666" />
                          <Text style={styles.playerText}>
                            {typeof sub === 'string' ? sub : sub?.name || 'Unknown'}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noDataText}>No substitutes</Text>
                    )}
                  </View>
                </View>

                {/* Registration Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Registration</Text>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="event" size={20} color="#666" />
                    <Text style={styles.detailText}>
                      {formatDate(selectedTeam.createdAt)}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // =====================================================
  // MATCH CARD COMPONENT
  // =====================================================
  const MatchCard = ({ match }) => {
    const isBye = match.isBye || match.status === "BYE";
    const statusColor = getStatusColor(match.status);

    return (
      <TouchableOpacity
        style={[
          styles.matchCard,
          { borderLeftColor: statusColor, borderLeftWidth: 4 },
        ]}
        onPress={() => {
          if (!isBye) {
            setSelectedMatch(match);
            setShowMatchModal(true);
            setShowScorecard(false);
          }
        }}
        disabled={isBye}
        activeOpacity={isBye ? 1 : 0.7}
      >
        {/* Match Header */}
        <View style={styles.matchHeader}>
          <View style={styles.matchBadge}>
            <Text style={styles.badgeText}>Match {match.matchNumber}</Text>
          </View>

          {/* Status Badge */}
          {match.status === "IN_PROGRESS" && (
            <View style={[styles.statusBadge, { backgroundColor: "#FF3B30" }]}>
              <View style={styles.liveDot} />
              <Text style={styles.statusText}>LIVE</Text>
            </View>
          )}
          {match.status === "COMPLETED" && (
            <View style={[styles.statusBadge, { backgroundColor: "#34C759" }]}>
              <Text style={styles.statusText}>COMPLETED</Text>
            </View>
          )}
          {isBye && (
            <View style={[styles.statusBadge, { backgroundColor: "#FF9500" }]}>
              <Text style={styles.statusText}>BYE</Text>
            </View>
          )}

          <View style={styles.matchBadge}>
            <Text style={styles.badgeText}>Court {match.courtNumber || "TBD"}</Text>
          </View>
        </View>

        {/* Teams */}
        <View style={styles.teamsRow}>
          {/* Team 1 */}
          <View style={styles.teamContainer}>
            <Image
              source={{ uri: match.team1?.image || "https://via.placeholder.com/40" }}
              style={styles.teamLogo}
            />
            <Text style={styles.teamNameText} numberOfLines={1}>
              {match.team1?.name || "TBD"}
            </Text>
          </View>

          {/* Score/VS */}
          <View style={styles.scoreContainer}>
            {match.status === "COMPLETED" ? (
              <Text style={styles.scoreText}>
                {match.team1?.sets || 0} - {match.team2?.sets || 0}
              </Text>
            ) : match.status === "IN_PROGRESS" ? (
              <View style={styles.liveScoreContainer}>
                <Text style={styles.liveScoreText}>
                  {match.liveState?.currentPoints?.home || 0}
                </Text>
                <Text style={styles.liveScoreDivider}>:</Text>
                <Text style={styles.liveScoreText}>
                  {match.liveState?.currentPoints?.away || 0}
                </Text>
              </View>
            ) : (
              <Text style={styles.vsText}>VS</Text>
            )}
          </View>

          {/* Team 2 */}
          <View style={styles.teamContainer}>
            <Text style={styles.teamNameText} numberOfLines={1}>
              {match.team2?.name || "TBD"}
            </Text>
            <Image
              source={{ uri: match.team2?.image || "https://via.placeholder.com/40" }}
              style={styles.teamLogo}
            />
          </View>
        </View>

        {/* Match Time */}
        {!isBye && (
          <View style={styles.matchFooter}>
            <MaterialIcons name="schedule" size={14} color="#666" />
            <Text style={styles.matchTime}>{formatTime(match.matchStartTime)}</Text>
            {match.status === "COMPLETED" && match.winningTeam && (
              <>
                <Text style={styles.footerDivider}>•</Text>
                <MaterialIcons name="emoji-events" size={14} color="#FFD700" />
                <Text style={styles.winnerText}>{match.winningTeam.name}</Text>
              </>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // =====================================================
  // MATCH DETAILS MODAL
  // =====================================================
  const MatchDetailsModal = () => (
    <Modal
      visible={showMatchModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        setShowMatchModal(false);
        setShowScorecard(false);
      }}
    >
      <View style={styles.modalOverlay}>
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButtonTop}
          onPress={() => {
            setShowMatchModal(false);
            setShowScorecard(false);
          }}
        >
          <MaterialIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.modalContainer}>

          {!showScorecard ? (
            // MATCH DETAILS VIEW
            <ScrollView style={styles.modalContent}>
              {/* Match Header */}
              <View style={styles.matchDetailHeader}>
                <Text style={styles.matchDetailTitle}>Match Details</Text>
                <View style={styles.matchDetailBadges}>
                  <View style={styles.detailBadge}>
                    <Text style={styles.detailBadgeText}>
                      Match {selectedMatch?.matchNumber}
                    </Text>
                  </View>
                  <View style={styles.detailBadge}>
                    <Text style={styles.detailBadgeText}>
                      Court {selectedMatch?.courtNumber || "TBD"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Teams Display */}
              <View style={styles.teamsDisplayContainer}>
                {/* Team 1 */}
                <View style={styles.teamDisplay}>
                  <Image
                    source={{
                      uri: selectedMatch?.team1?.image || "https://via.placeholder.com/60",
                    }}
                    style={styles.teamDisplayLogo}
                  />
                  <Text style={styles.teamDisplayName}>
                    {selectedMatch?.team1?.name || "Team 1"}
                  </Text>
                  {selectedMatch?.status === "COMPLETED" && (
                    <Text style={styles.teamSets}>
                      {selectedMatch?.team1?.sets || 0} sets
                    </Text>
                  )}
                </View>

                <Text style={styles.vsTextLarge}>VS</Text>

                {/* Team 2 */}
                <View style={styles.teamDisplay}>
                  <Image
                    source={{
                      uri: selectedMatch?.team2?.image || "https://via.placeholder.com/60",
                    }}
                    style={styles.teamDisplayLogo}
                  />
                  <Text style={styles.teamDisplayName}>
                    {selectedMatch?.team2?.name || "Team 2"}
                  </Text>
                  {selectedMatch?.status === "COMPLETED" && (
                    <Text style={styles.teamSets}>
                      {selectedMatch?.team2?.sets || 0} sets
                    </Text>
                  )}
                </View>
              </View>

              {/* Team Details Sections */}
              <View style={styles.teamDetailsGrid}>
                {/* Team 1 Details */}
                <View style={styles.teamDetailsSection}>
                  <Text style={styles.teamDetailsSectionTitle}>
                    {selectedMatch?.team1?.name || "Team 1"}
                  </Text>

                  <View style={styles.detailItem}>
                    <MaterialIcons name="star" size={18} color="#FFD700" />
                    <Text style={styles.detailItemLabel}>Captain:</Text>
                    <Text style={styles.detailItemValue}>
                      {selectedMatch?.team1?.captain || "Unknown"}
                    </Text>
                  </View>

                  <Text style={styles.subSectionTitle}>Players</Text>
                  {selectedMatch?.team1?.players?.map((player, index) => (
                    <View key={index} style={styles.playerDetailRow}>
                      <MaterialIcons name="person" size={16} color="#666" />
                      <Text style={styles.playerDetailText}>
                        {typeof player === 'string' ? player : player?.name || 'Unknown'}
                      </Text>
                    </View>
                  ))}

                  {selectedMatch?.team1?.substitutes?.length > 0 && (
                    <>
                      <Text style={styles.subSectionTitle}>Substitutes</Text>
                      {selectedMatch.team1.substitutes.map((sub, index) => (
                        <View key={index} style={styles.playerDetailRow}>
                          <MaterialIcons name="sync" size={16} color="#666" />
                          <Text style={styles.playerDetailText}>
                            {typeof sub === 'string' ? sub : sub?.name || 'Unknown'}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}
                </View>

                {/* Team 2 Details */}
                <View style={styles.teamDetailsSection}>
                  <Text style={styles.teamDetailsSectionTitle}>
                    {selectedMatch?.team2?.name || "Team 2"}
                  </Text>

                  <View style={styles.detailItem}>
                    <MaterialIcons name="star" size={18} color="#FFD700" />
                    <Text style={styles.detailItemLabel}>Captain:</Text>
                    <Text style={styles.detailItemValue}>
                      {selectedMatch?.team2?.captain || "Unknown"}
                    </Text>
                  </View>

                  <Text style={styles.subSectionTitle}>Players</Text>
                  {selectedMatch?.team2?.players?.map((player, index) => (
                    <View key={index} style={styles.playerDetailRow}>
                      <MaterialIcons name="person" size={16} color="#666" />
                      <Text style={styles.playerDetailText}>
                        {typeof player === 'string' ? player : player?.name || 'Unknown'}
                      </Text>
                    </View>
                  ))}

                  {selectedMatch?.team2?.substitutes?.length > 0 && (
                    <>
                      <Text style={styles.subSectionTitle}>Substitutes</Text>
                      {selectedMatch.team2.substitutes.map((sub, index) => (
                        <View key={index} style={styles.playerDetailRow}>
                          <MaterialIcons name="sync" size={16} color="#666" />
                          <Text style={styles.playerDetailText}>
                            {typeof sub === 'string' ? sub : sub?.name || 'Unknown'}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              </View>

              {/* Match Schedule */}
              <View style={styles.scheduleSection}>
                <Text style={styles.scheduleSectionTitle}>Schedule</Text>
                <View style={styles.scheduleRow}>
                  <MaterialIcons name="event" size={20} color="#007AFF" />
                  <Text style={styles.scheduleLabel}>Date:</Text>
                  <Text style={styles.scheduleValue}>
                    {formatDate(selectedMatch?.matchStartTime)}
                  </Text>
                </View>
                <View style={styles.scheduleRow}>
                  <MaterialIcons name="schedule" size={20} color="#007AFF" />
                  <Text style={styles.scheduleLabel}>Time:</Text>
                  <Text style={styles.scheduleValue}>
                    {formatTime(selectedMatch?.matchStartTime)}
                  </Text>
                </View>
                <View style={styles.scheduleRow}>
                  <MaterialIcons name="location-on" size={20} color="#007AFF" />
                  <Text style={styles.scheduleLabel}>Venue:</Text>
                  <Text style={styles.scheduleValue}>
                    {selectedMatch?.venue || "Not Set"}
                  </Text>
                </View>
                <View style={styles.scheduleRow}>
                  <MaterialIcons name="sports" size={20} color="#007AFF" />
                  <Text style={styles.scheduleLabel}>Format:</Text>
                  <Text style={styles.scheduleValue}>
                    {selectedMatch?.format || "Standard"}
                  </Text>
                </View>
              </View>

              {/* View Scorecard Button */}
              {selectedMatch?.matches && selectedMatch.matches.length > 0 && (
                <TouchableOpacity
                  style={styles.viewScorecardButton}
                  onPress={() => setShowScorecard(true)}
                >
                  <MaterialIcons name="assessment" size={20} color="#FFF" />
                  <Text style={styles.viewScorecardButtonText}>View Detailed Scorecard</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : (
            // SCORECARD VIEW
            <ScrollView style={styles.modalContent}>
              {/* Scorecard Header */}
              <View style={styles.scorecardHeader}>
                <TouchableOpacity
                  onPress={() => setShowScorecard(false)}
                  style={styles.backButton}
                >
                  <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.scorecardTitle}>Detailed Scorecard</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedMatch?.status) }]}>
                  <Text style={styles.statusText}>{selectedMatch?.status}</Text>
                </View>
              </View>

              {/* Sets Breakdown */}
              {selectedMatch?.matches && selectedMatch.matches.length > 0 ? (
                selectedMatch.matches.map((set, setIndex) => (
                  <View key={setIndex} style={styles.setContainer}>
                    {/* Set Header */}
                    <View style={styles.setHeader}>
                      <Text style={styles.setText}>Set {set.setNumber}</Text>
                      <Text style={styles.setType}>{set.type || "Standard"}</Text>
                      <Text style={styles.setScore}>
                        {set.score || "0-0"}
                      </Text>
                    </View>

                    {/* Set Winner */}
                    {set.setWinner && (
                      <View style={styles.setWinnerRow}>
                        <MaterialIcons name="emoji-events" size={16} color="#FFD700" />
                        <Text style={styles.setWinnerText}>
                          Set won by {set.setWinner === "home" ? selectedMatch.team1?.name : selectedMatch.team2?.name}
                        </Text>
                      </View>
                    )}

                    {/* Teams Row */}
                    <View style={styles.setTeamsRow}>
                      <Text style={styles.setTeamName}>{selectedMatch?.team1?.name}</Text>
                      <Text style={styles.setTeamName}>{selectedMatch?.team2?.name}</Text>
                    </View>

                    {/* Games Breakdown */}
                    {set.games && set.games.length > 0 && (
                      <View style={styles.gamesContainer}>
                        <Text style={styles.gamesTitle}>Games</Text>
                        {set.games.map((game, gameIndex) => (
                          <View key={gameIndex} style={styles.gameRow}>
                            <View style={styles.gameNumberBadge}>
                              <Text style={styles.gameNumber}>{game.gameNumber}</Text>
                            </View>
                            <Text style={styles.gameScore}>{game.score}</Text>
                            {game.winner && (
                              <View style={styles.gameWinnerBadge}>
                                <MaterialIcons name="check-circle" size={14} color="#34C759" />
                                <Text style={styles.gameWinnerText}>
                                  {game.winner === "home" ? "Home" : "Away"}
                                </Text>
                              </View>
                            )}
                            {game.status && (
                              <View style={[
                                styles.gameStatusBadge,
                                { backgroundColor: getStatusColor(game.status) }
                              ]}>
                                <Text style={styles.gameStatusText}>{game.status}</Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.noScorecardContainer}>
                  <MaterialIcons name="scoreboard" size={64} color="#CCC" />
                  <Text style={styles.noScorecardText}>No scorecard data available</Text>
                  <Text style={styles.noScorecardSubtext}>
                    Scores will appear once the match starts
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  // =====================================================
  // MAIN RENDER
  // =====================================================
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading tournament data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "teams" && styles.activeTab]}
          onPress={() => setActiveTab("teams")}
        >
          <MaterialIcons
            name="groups"
            size={24}
            color={activeTab === "teams" ? "#007AFF" : "#8E8E93"}
          />
          <Text style={[styles.tabText, activeTab === "teams" && styles.activeTabText]}>
            Teams ({teams.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "matches" && styles.activeTab]}
          onPress={() => setActiveTab("matches")}
        >
          <MaterialIcons
            name="sports-tennis"
            size={24}
            color={activeTab === "matches" ? "#007AFF" : "#8E8E93"}
          />
          <Text style={[styles.tabText, activeTab === "matches" && styles.activeTabText]}>
            Matches ({matches.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === "teams" ? (
          // TEAMS TAB
          <View style={styles.teamsContainer}>
            {teams.length > 0 ? (
              teams.map((team, index) => (
                <TeamCard key={team._id || index} team={team} index={index} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="groups" size={64} color="#CCC" />
                <Text style={styles.emptyStateText}>No teams registered yet</Text>
              </View>
            )}
          </View>
        ) : (
          // MATCHES TAB
          <View style={styles.matchesContainer}>
            {matches.length > 0 ? (
              // Group matches by round
              [...Array(totalRounds)]
                .map((_, i) => totalRounds - i)
                .map((round) => {
                  const roundMatches = matches.filter((m) => m.round === round);
                  if (roundMatches.length === 0) return null;

                  return (
                    <View key={round} style={styles.roundSection}>
                      <View style={styles.roundHeader}>
                        <MaterialIcons name="emoji-events" size={24} color="#FF3B30" />
                        <Text style={styles.roundTitle}>{getRoundName(round)}</Text>
                      </View>
                      {roundMatches.map((match) => (
                        <MatchCard key={match._id} match={match} />
                      ))}
                    </View>
                  );
                })
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="sports-tennis" size={64} color="#CCC" />
                <Text style={styles.emptyStateText}>No matches scheduled yet</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <TeamDetailsModal />
      <MatchDetailsModal />
    </View>
  );
};

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },

  // Tab Navigation
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    gap: 8,
  },
  activeTab: {
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#8E8E93",
  },
  activeTabText: {
    color: "#007AFF",
    fontWeight: "600",
  },

  // Content
  content: {
    flex: 1,
  },

  // Teams Container
  teamsContainer: {
    padding: 16,
  },
  teamCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  teamCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  teamNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  teamNumberText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  teamMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  teamCaptain: {
    fontSize: 14,
    color: "#666",
  },

  // Matches Container
  matchesContainer: {
    padding: 16,
  },
  roundSection: {
    marginBottom: 24,
  },
  roundHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  roundTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  matchCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  matchHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  matchBadge: {
    backgroundColor: "#F5F5F7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    marginLeft: "auto",
  },
  statusText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFF",
  },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  teamContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E5EA",
  },
  teamNameText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    flex: 1,
  },
  scoreContainer: {
    paddingHorizontal: 16,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
  liveScoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  liveScoreText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FF3B30",
  },
  liveScoreDivider: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FF3B30",
  },
  vsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8E8E93",
  },
  matchFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F7",
  },
  matchTime: {
    fontSize: 13,
    color: "#666",
  },
  footerDivider: {
    fontSize: 13,
    color: "#8E8E93",
    marginHorizontal: 4,
  },
  winnerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFD700",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "97%",
    maxHeight: "85%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  closeButton: {
    padding: 4,
  },

  teamcloseButtonTop: {
    position: "absolute",
    top: 110,
    right: 16,
    zIndex: 10,
    backgroundColor: "#F5F5F7",
    borderRadius: 20,
    padding: 8,
  },

  closeButtonTop: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: "#F5F5F7",
    borderRadius: 20,
    padding: 8,
  },
  modalContent: {
    padding: 20,
  },

  // Team Modal
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8E8E93",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#F5F5F7",
    borderRadius: 8,
  },
  detailText: {
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
  },
  twoColumnSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  column: {
    flex: 1,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F5F5F7",
    borderRadius: 8,
    marginBottom: 6,
  },
  playerText: {
    fontSize: 14,
    color: "#000",
    flex: 1,
  },
  noDataText: {
    fontSize: 14,
    color: "#8E8E93",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },

  // Match Modal
  matchDetailHeader: {
    marginBottom: 20,
  },
  matchDetailTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },
  matchDetailBadges: {
    flexDirection: "row",
    gap: 8,
  },
  detailBadge: {
    backgroundColor: "#F5F5F7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  detailBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  teamsDisplayContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 24,
    backgroundColor: "#F5F5F7",
    borderRadius: 16,
    marginBottom: 24,
  },
  teamDisplay: {
    alignItems: "center",
  },
  teamDisplayLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E5E5EA",
    marginBottom: 8,
  },
  teamDisplayName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
  teamSets: {
    fontSize: 12,
    color: "#007AFF",
    marginTop: 4,
  },
  vsTextLarge: {
    fontSize: 20,
    fontWeight: "700",
    color: "#8E8E93",
  },
  teamDetailsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  teamDetailsSection: {
    flex: 1,
    backgroundColor: "#F5F5F7",
    padding: 16,
    borderRadius: 12,
  },
  teamDetailsSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  detailItemLabel: {
    fontSize: 13,
    color: "#666",
  },
  detailItemValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
    flex: 1,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 12,
    marginBottom: 8,
  },
  playerDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  playerDetailText: {
    fontSize: 13,
    color: "#000",
  },
  scheduleSection: {
    backgroundColor: "#F5F5F7",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  scheduleSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  scheduleLabel: {
    fontSize: 14,
    color: "#666",
    width: 60,
  },
  scheduleValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    flex: 1,
  },
  viewScorecardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 30,
  },
  viewScorecardButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // Scorecard
  scorecardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  scorecardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    flex: 1,
  },
  setContainer: {
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  setHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  setText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  setType: {
    fontSize: 13,
    color: "#666",
    flex: 1,
  },
  setScore: {
    fontSize: 20,
    fontWeight: "700",
    color: "#007AFF",
  },
  setWinnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF9E6",
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  setWinnerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B8860B",
  },
  setTeamsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  setTeamName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  gamesContainer: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 12,
  },
  gamesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8E8E93",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  gameRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F7",
    gap: 12,
  },
  gameNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  gameNumber: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  gameScore: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    flex: 1,
  },
  gameWinnerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gameWinnerText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#34C759",
  },
  gameStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gameStatusText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
  noScorecardContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  noScorecardText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 16,
  },
  noScorecardSubtext: {
    fontSize: 14,
    color: "#C7C7CC",
    marginTop: 8,
    textAlign: "center",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#8E8E93",
    marginTop: 16,
  },
});

export default TeamKnockouts;
