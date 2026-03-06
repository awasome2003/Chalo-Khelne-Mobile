import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AntDesign from "react-native-vector-icons/AntDesign";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import API from "../../api/api";
import TournamentConfig from "../../api/tournaments";

const { width } = Dimensions.get("window");

const PaymentHistoryScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // State variables
  const [search, setSearch] = useState("");
  const [activeModal, setActiveModal] = useState(null); // 'amount' | 'date' | 'status' | null
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [selectedAmountOptions, setSelectedAmountOptions] = useState([]);
  const [selectedDateOption, setSelectedDateOption] = useState("All Time");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [appliedFilters, setAppliedFilters] = useState({});

  // Filter options
  const amountOptionsList = [
    "Up to ₹100",
    "₹100 - ₹500",
    "₹500 - ₹2000",
    "Above ₹2000",
  ];
  const dateOptionsList = [
    "Today",
    "This Week",
    "This Month",
    "Last 3 Months",
    "All Time",
  ];
  const statusOptionsList = ["All", "Confirmed", "Pending", "Cancelled"];

  // Fetch transactions on component mount
  useEffect(() => {
    if (user?.id || user?._id) {
      fetchTransactions();
    }
  }, [user]);

  // Apply filters when search or applied filters change
  useEffect(() => {
    filterTransactions();
  }, [search, transactions, appliedFilters]);

  // Fetch all types of transactions
  const fetchTransactions = async () => {
    if (!user || (!user.id && !user._id)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const userId = user.id || user._id;

    try {
      // Fetch only turf and tournament bookings, exclude coaching/training

      const [turfResponse, tournamentResponse] = await Promise.all([
        axios.get(API.ENDPOINTS.TURF_BOOKINGS.USER_BOOKINGS(userId)),
        axios.get(TournamentConfig.ENDPOINTS.BOOKINGS.BY_USER(userId)),
      ]);
      // Process turf bookings
      // const turfBookings = turfResponse.data.success
      //   ? turfResponse.data.bookings.map((booking) => ({
      //       id: booking._id,
      //       type: "Turf Booking",
      //       title: booking.turfName || "Turf Booking",
      //       date: new Date(booking.date),
      //       dateStr: new Date(booking.date).toLocaleDateString(),
      //       timeSlot: booking.timeSlot,
      //       amount: booking.amount,
      //       status: booking.status,
      //       paymentStatus: booking.paymentStatus || "pending",
      //       paymentMethod: booking.paymentMethod || "cash",
      //       avatar: booking.turfId?.images?.[0]
      //         ? { uri: `${API.UPLOADS_URL}/${booking.turfId.images[0]}` }
      //         : require("../../../assets/turf.jpg"),
      //     }))
      //   : [];

      // Process tournament bookings with robust shape handling
      const tRaw = Array.isArray(tournamentResponse.data)
        ? tournamentResponse.data
        : Array.isArray(tournamentResponse.data?.data)
          ? tournamentResponse.data.data
          : Array.isArray(tournamentResponse.data?.bookings)
            ? tournamentResponse.data.bookings
            : Array.isArray(tournamentResponse.data?.payments)
              ? tournamentResponse.data.payments
              : [];

      const tournamentBookings = tRaw.map((booking) => {
        const createdAt = booking.createdAt || booking.date || Date.now();
        const amount = booking.amount || booking.paymentAmount || booking.price || 0;
        const status = booking.status || booking.paymentStatus || "pending";
        const method = booking.method || booking.paymentMethod || "cash";
        const title = booking.tournamentName || booking.title || "Tournament Booking";
        const imageUrl = booking.imageUrl;
        return {
          id: booking._id || booking.id,
          type: "Tournament Fee",
          tournamentId: booking.tournamentId || booking.tournament || booking._id || booking.id,
          title,
          date: new Date(createdAt),
          dateStr: new Date(createdAt).toLocaleDateString(),
          amount,
          status,
          paymentStatus: status,
          paymentMethod: method,
          avatar: imageUrl
            ? { uri: imageUrl.startsWith("http") ? imageUrl : `${API.UPLOADS_URL}/${imageUrl}` }
            : require("../../../assets/tournament-banner.jpg"),
        };
      });

      // Combine all transactions and sort by date (newest first)
      const allTransactions = [...tournamentBookings].sort(
        (a, b) => b.date - a.date
      );

      setTransactions(allTransactions);
      setFilteredTransactions(allTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setError("Failed to load payment history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions based on search, tab, amount, date, and status
  const filterTransactions = () => {
    if (!transactions.length) {
      setFilteredTransactions([]);
      return;
    }

    let filtered = [...transactions];

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (transaction) =>
          transaction.title.toLowerCase().includes(searchLower) ||
          transaction.type.toLowerCase().includes(searchLower) ||
          transaction.status.toLowerCase().includes(searchLower) ||
          transaction.amount.toString().includes(searchLower)
      );
    }

    // Apply filters if any are active
    if (Object.keys(appliedFilters).length > 0) {
      // Amount filter
      if (
        appliedFilters.amountRanges &&
        appliedFilters.amountRanges.length > 0
      ) {
        filtered = filtered.filter((transaction) => {
          const amount = transaction.amount;
          return appliedFilters.amountRanges.some((range) => {
            if (range === "Up to ₹100") {
              return amount <= 100;
            } else if (range === "₹100 - ₹500") {
              return amount > 100 && amount <= 500;
            } else if (range === "₹500 - ₹2000") {
              return amount > 500 && amount <= 2000;
            } else if (range === "Above ₹2000") {
              return amount > 2000;
            }
            return true;
          });
        });
      }

      // Date filter
      if (appliedFilters.dateRange) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const getDateRange = () => {
          switch (appliedFilters.dateRange) {
            case "Today":
              return {
                start: today,
                end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
              };
            case "This Week": {
              const startOfWeek = new Date(today);
              startOfWeek.setDate(today.getDate() - today.getDay());
              const endOfWeek = new Date(startOfWeek);
              endOfWeek.setDate(startOfWeek.getDate() + 7);
              return { start: startOfWeek, end: endOfWeek };
            }
            case "This Month": {
              const startOfMonth = new Date(
                today.getFullYear(),
                today.getMonth(),
                1
              );
              const endOfMonth = new Date(
                today.getFullYear(),
                today.getMonth() + 1,
                0
              );
              return { start: startOfMonth, end: endOfMonth };
            }
            case "Last 3 Months": {
              const startOfRange = new Date(today);
              startOfRange.setMonth(today.getMonth() - 3);
              return { start: startOfRange, end: today };
            }
            default:
              return null;
          }
        };

        const dateRange = getDateRange();
        if (dateRange) {
          filtered = filtered.filter((transaction) => {
            const transactionDate = new Date(transaction.date);
            return (
              transactionDate >= dateRange.start &&
              transactionDate <= dateRange.end
            );
          });
        }
      }

      // Status filter
      if (appliedFilters.status && appliedFilters.status !== "All") {
        filtered = filtered.filter((transaction) => {
          const status = transaction.status.toLowerCase();
          return status === appliedFilters.status.toLowerCase();
        });
      }
    }

    setFilteredTransactions(filtered);
  };

  // Removed getPaymentCountByCategory since tabs are removed

  // Toggle amount filter option
  const toggleAmountOption = (option) => {
    setSelectedAmountOptions((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    );
  };

  // Apply filters
  const applyFilters = () => {
    const newFilters = {};

    if (activeModal === "amount" && selectedAmountOptions.length > 0) {
      newFilters.amountRanges = selectedAmountOptions;
    }

    if (activeModal === "date" && selectedDateOption !== "All Time") {
      newFilters.dateRange = selectedDateOption;
    }

    if (activeModal === "status" && selectedStatus !== "All") {
      newFilters.status = selectedStatus;
    }

    setAppliedFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));

    setActiveModal(null);
  };

  // Clear all filters
  const clearAllFilters = () => {
    if (activeModal === "amount") {
      setSelectedAmountOptions([]);
    } else if (activeModal === "date") {
      setSelectedDateOption("All Time");
    } else if (activeModal === "status") {
      setSelectedStatus("All");
    }
  };

  // Clear applied filters
  const clearAppliedFilters = () => {
    setAppliedFilters({});
    setSelectedAmountOptions([]);
    setSelectedDateOption("All Time");
    setSelectedStatus("All");
  };

  // Format amount with currency symbol
  const formatAmount = (amount) => {
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  // Get avatar letter from name
  const getAvatarLetter = (name) => {
    return name ? name.charAt(0).toUpperCase() : "P";
  };

  // Get status color
  const getStatusColor = (status) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "confirmed" || statusLower === "paid") {
      return "#4CAF50"; // Green
    } else if (statusLower === "pending") {
      return "#FF9800"; // Orange
    } else if (statusLower === "cancelled") {
      return "#F44336"; // Red
    }
    return "#666"; // Default grey
  };

  // Removed downloadReport as requested

  // Render transaction item
  const renderTransaction = ({ item }) => (
    <View style={styles.transactionRow}>
      <View style={styles.avatar}>
        {typeof item.avatar === "object" ? (
          <Image source={item.avatar} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{getAvatarLetter(item.title)}</Text>
        )}
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.name} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.detailsRow}>
          <Text style={styles.date}>{item.dateStr}</Text>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor:
                  item.type === "Turf Booking" ? "#E3F2FD" : "#FFF8E1",
              },
            ]}
          >
            <Text
              style={[
                styles.typeText,
                { color: item.type === "Turf Booking" ? "#1976D2" : "#F57C00" },
              ]}
            >
              {item.type}
            </Text>
          </View>
        </View>
        <View style={styles.statusRow}>
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.amount}>{formatAmount(item.amount)}</Text>
    </View>
  );

  // Render filter modal
  const renderFilterModal = () => {
    // Determine which filter is active
    const isAmountFilter = activeModal === "amount";
    const isDateFilter = activeModal === "date";
    const isStatusFilter = activeModal === "status";

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={activeModal !== null}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.filterModalOverlay}>
          <TouchableOpacity
            style={[styles.floatingClose, { top: -50 - insets.bottom }]}
            onPress={() => setActiveModal(null)}
          >
            <MaterialIcons name="close" size={20} color="#000" />
          </TouchableOpacity>
          <View style={[styles.filterModalWrapper, { paddingBottom: 20 + insets.bottom }]}>


            <View style={styles.filterModalContainer}>
              <View style={styles.filterModalHeader}>
                <Text style={styles.filterModalTitle}>
                  {isAmountFilter ? "Amount" : isDateFilter ? "Date" : "Status"}
                </Text>
              </View>

              <View style={{ paddingHorizontal: 16, marginTop: 10 }}>
                {isAmountFilter &&
                  amountOptionsList.map((label, index) => {
                    const isSelected = selectedAmountOptions.includes(label);
                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.filterOption}
                        onPress={() => toggleAmountOption(label)}
                      >
                        <Text style={styles.optionLabel}>{label}</Text>
                        <View
                          style={[
                            styles.checkbox,
                            isSelected && styles.checkedBox,
                          ]}
                        >
                          {isSelected && (
                            <MaterialIcons
                              name="check"
                              size={14}
                              color="#fff"
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                {isDateFilter &&
                  dateOptionsList.map((label, index) => {
                    const isSelected = selectedDateOption === label;
                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.filterOption}
                        onPress={() => setSelectedDateOption(label)}
                      >
                        <Text style={styles.optionLabel}>{label}</Text>
                        <View
                          style={[
                            styles.checkbox,
                            isSelected && styles.checkedBox,
                            { borderRadius: 12 },
                          ]}
                        >
                          {isSelected && (
                            <MaterialIcons
                              name="radio-button-checked"
                              size={14}
                              color="#fff"
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                {isStatusFilter &&
                  statusOptionsList.map((label, index) => {
                    const isSelected = selectedStatus === label;
                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.filterOption}
                        onPress={() => setSelectedStatus(label)}
                      >
                        <Text style={styles.optionLabel}>{label}</Text>
                        <View
                          style={[
                            styles.checkbox,
                            isSelected && styles.checkedBox,
                            { borderRadius: 12 },
                          ]}
                        >
                          {isSelected && (
                            <MaterialIcons
                              name="radio-button-checked"
                              size={14}
                              color="#fff"
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
              </View>

              <View style={styles.filterModalActions}>
                <TouchableOpacity onPress={clearAllFilters}>
                  <Text style={styles.clearAll}>Clear all</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={applyFilters}
                >
                  <Text style={styles.applyText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Render active filters chips
  const renderActiveFilters = () => {
    if (Object.keys(appliedFilters).length === 0) {
      return null;
    }

    return (
      <View style={styles.activeFiltersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {appliedFilters.amountRanges?.map((range, index) => (
            <View key={`amount-${index}`} style={styles.filterChip}>
              <Text style={styles.filterChipText}>{range}</Text>
              <TouchableOpacity
                onPress={() => {
                  const newFilters = { ...appliedFilters };
                  newFilters.amountRanges = newFilters.amountRanges.filter(
                    (r) => r !== range
                  );
                  if (newFilters.amountRanges.length === 0) {
                    delete newFilters.amountRanges;
                  }
                  setAppliedFilters(newFilters);
                }}
              >
                <MaterialIcons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          ))}

          {appliedFilters.dateRange && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>
                {appliedFilters.dateRange}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const newFilters = { ...appliedFilters };
                  delete newFilters.dateRange;
                  setAppliedFilters(newFilters);
                }}
              >
                <MaterialIcons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          {appliedFilters.status && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{appliedFilters.status}</Text>
              <TouchableOpacity
                onPress={() => {
                  const newFilters = { ...appliedFilters };
                  delete newFilters.status;
                  setAppliedFilters(newFilters);
                }}
              >
                <MaterialIcons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={clearAppliedFilters}
          >
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  // Removed tabs as we only have one transaction type

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
      </View>

      <View style={{ marginBottom: 15 }} />

      {/* Search & Filter Row */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <MaterialIcons
            name="search"
            size={16}
            color="#888"
            style={{ marginHorizontal: 8 }}
          />
          <TextInput
            placeholder="Search Transactions"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* <TouchableOpacity style={styles.filterIcon}>
          <MaterialIcons name="sort" size={20} color="#000" />
        </TouchableOpacity> */}
      </View>

      {/* Filter Row */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            appliedFilters.status && styles.activeFilterButton,
          ]}
          onPress={() => setActiveModal("status")}
        >
          <Text style={appliedFilters.status ? styles.activeFilterText : null}>
            Status
          </Text>
          <MaterialIcons
            name={appliedFilters.status ? "check-circle" : "chevron-right"}
            size={18}
            color={appliedFilters.status ? "#FF6A00" : "#000"}
            style={
              appliedFilters.status
                ? null
                : { transform: [{ rotate: "90deg" }] }
            }
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            appliedFilters.dateRange && styles.activeFilterButton,
          ]}
          onPress={() => setActiveModal("date")}
        >
          <Text
            style={appliedFilters.dateRange ? styles.activeFilterText : null}
          >
            Date
          </Text>
          <MaterialIcons
            name={
              appliedFilters.dateRange ? "event-available" : "calendar-month"
            }
            size={16}
            color={appliedFilters.dateRange ? "#FF6A00" : "#000"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            appliedFilters.amountRanges && styles.activeFilterButton,
          ]}
          onPress={() => setActiveModal("amount")}
        >
          <Text
            style={appliedFilters.amountRanges ? styles.activeFilterText : null}
          >
            Amount
          </Text>
          <MaterialIcons
            name={
              appliedFilters.amountRanges ? "check-circle" : "chevron-right"
            }
            size={18}
            color={appliedFilters.amountRanges ? "#FF6A00" : "#000"}
            style={
              appliedFilters.amountRanges
                ? null
                : { transform: [{ rotate: "90deg" }] }
            }
          />
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
      {renderActiveFilters()}

      {/* Transaction List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6A00" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchTransactions}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredTransactions.length > 0 ? (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="receipt-long" size={60} color="#ddd" />
          <Text style={styles.emptyText}>
            {search ||
              Object.keys(appliedFilters).length > 0 ||
              selectedTab !== "All Payments"
              ? "No transactions match your search or filters"
              : "No payment history found"}
          </Text>
          {(search ||
            Object.keys(appliedFilters).length > 0 ||
            selectedTab !== "All Payments") && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => {
                  setSearch("");
                  clearAppliedFilters();
                  setSelectedTab("All Payments");
                }}
              >
                <Text style={styles.clearSearchText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
        </View>
      )}

      {/* Filter Modal */}
      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f4f6",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    width: "100%",
  },
  searchRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: "center",
  },
  searchInputWrapper: {
    flex: 1,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterIcon: {
    width: 36,
    height: 36,
    backgroundColor: "#fff",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: "center",
    gap: 8,
  },
  filterButton: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#ccc",
    borderWidth: 1,
    gap: 5,
  },
  activeFilterButton: {
    borderColor: "#FF6A00",
    backgroundColor: "#FFF8F6",
  },
  activeFilterText: {
    color: "#FF6A00",
    fontWeight: "500",
  },
  transactionRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    backgroundColor: "#2196f3",
    borderRadius: 20,
    width: 40,
    height: 40,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  transactionInfo: {
    flex: 1,
  },
  name: {
    fontWeight: "400",
    fontSize: 14,
    color: "#333",
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  date: {
    fontSize: 11,
    color: "#666",
    fontWeight: "400",
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "500",
  },
  statusRow: {
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  amount: {
    fontWeight: "600",
    fontSize: 14,
    color: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  errorText: {
    color: "#666",
    marginTop: 16,
    marginBottom: 20,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryButton: {
    backgroundColor: "#FF6A00",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: "#fff",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    color: "#666",
    marginTop: 16,
    marginBottom: 20,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  clearSearchButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearSearchText: {
    color: "#666",
  },
  // Filter Modal
  filterModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  filterModalWrapper: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  filterModalContainer: {
    paddingTop: 20,
  },
  filterModalHeader: {
    paddingHorizontal: 16,
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  filterModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 20,
  },
  floatingClose: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 20,
    position: "absolute",
    top: -50,
    right: 20,
    alignSelf: "center",
    zIndex: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  filterOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  optionLabel: {
    fontSize: 14,
    color: "#333",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: "#888",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checkedBox: {
    backgroundColor: "#ff6600",
    borderColor: "#ff6600",
  },
  clearAll: {
    color: "#ff6600",
    fontWeight: "500",
    fontSize: 14,
  },
  applyButton: {
    backgroundColor: "#ff6600",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  applyText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  // Active Filters
  activeFiltersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    marginRight: 4,
  },
  clearFiltersButton: {
    backgroundColor: "#ffe0d6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  clearFiltersText: {
    color: "#FF6A00",
    fontSize: 12,
  },
});

export default PaymentHistoryScreen;
