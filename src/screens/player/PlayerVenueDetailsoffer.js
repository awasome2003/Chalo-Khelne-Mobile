import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import Carousel from 'react-native-reanimated-carousel';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { MaterialIcons } from '@expo/vector-icons'; // For the double arrow icon
import SwipeButton from 'rn-swipe-button';

const { width } = Dimensions.get('window');

const images = [
  require('../assets/1.png'),
  require('../assets/2.png'),
  require('../assets/Rectangle 38.png'),
];

export default function VenueScreen() {
  const carouselRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f4f7' }}>
      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>

        <Text style={styles.title}>Venue Details</Text>

        <View style={styles.rightIcons}>
          <TouchableOpacity style={styles.iconSpacing}>
            <Feather name="heart" size={20} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Feather name="share-2" size={20} color="#333" />
          </TouchableOpacity>
        </View>
      </View> */}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Carousel */}
        <View style={styles.carouselWrapper}>
          <Carousel
            ref={carouselRef}
            width={width}
            height={250}
            autoPlay
            data={images}
            scrollAnimationDuration={3000}
            renderItem={({ item }) => (
              <View style={styles.imageWrapper}>
                <Image source={item} style={styles.image} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.leftArrow}
                  onPress={() => carouselRef.current?.prev()}
                >
                  <Ionicons name="chevron-back" size={15} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rightArrow}
                  onPress={() => carouselRef.current?.next()}
                >
                  <Ionicons name="chevron-forward" size={15} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            loop
            pagingEnabled
            mode="parallax"
            modeConfig={{
              parallaxScrollingScale: 0.9,
              parallaxScrollingOffset: 40,
            }}
            onSnapToItem={(index) => setActiveIndex(index)}
          />
        </View>

        {/* Indicator */}
        <View style={styles.indicatorContainer}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, activeIndex === index && styles.activeDot]}
            />
          ))}
        </View>

        {/* Venue Info Card */}
        <View style={styles.venueCard}>
          <Text style={styles.cardTitle}>T12 Sports Turf</Text>

          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.label}>Address :</Text>
              <Text style={styles.address}>
                Turf Sports Club, Ganesh Nagar, Opposite City Hospital, Sector 12,
                Nigadi, Pune - 411017, India
              </Text>
            </View>

            <View style={styles.direction}>
            <MaterialIcons name="directions" size={24} color="#007BFF" />
                          <Text style={styles.distance}>2.9 km</Text>
            </View>
          </View>

          <Text style={styles.price}>
            ₹ <Text style={{ fontWeight: '600' }}>600/-</Text> onward
          </Text>

          <View style={{ marginTop: 6 }}>
            <Text style={styles.time}>
              <Text style={styles.label}>Time :</Text> 6:00 AM - 11:59 PM
            </Text>
            <View style={[styles.ratingBlock, { marginTop: 6 }]}>
              {[1, 2, 3, 4].map((_, i) => (
                <Ionicons key={i} name="star" size={18} color="#FFD700" />
              ))}
              <Ionicons name="star-outline" size={18} color="#FFD700" />
              <Text style={styles.ratingText}>4/5 (2345)</Text>
            </View>
          </View>
        </View>

        {/* Available Sports Section */}
        <AvailableSports />

        {/* About Turf Section */}
        <AboutTurf />
        <OfferCard />
        {/* Amenities Section */}
        <AmenitiesSection />
        <TurfRulesSection />
        <BookNowButton />
       
      </ScrollView>
    </View>
  );
}

const AvailableSports = () => {
  const sports = [
    { name: 'Box Cricket', icon: 'cricket' },
    { name: 'Football', icon: 'soccer' },
    { name: 'Badminton', icon: 'badminton' },
    { name: 'Table Tennis', icon: 'table-tennis' },
  ];

  return (
    <View style={styles.sportsContainer}>
      <Text style={styles.sectionTitle}>Available Sports</Text>
      <View style={styles.sportsRow}>
        {sports.map((sport, index) => (
          <View key={index} style={styles.sportItem}>
            <View style={styles.sportIconWrap}>
              <MaterialCommunityIcons
                name={sport.icon}
                size={24}
                color="#1D6A8B"
              
              />
            </View>
            <Text style={styles.sportLabel}>{sport.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const AboutTurf = () => {
  const [showMore, setShowMore] = useState(false);

  return (
    <View style={styles.aboutContainer}>
      <Text style={styles.sectionTitle}>About Turf</Text>
      <Text style={styles.aboutText}>
        Looking for a great place to play cricket or football? This Turf offers a premium experience
        with well-maintained facilities at budget-friendly rates. Enjoy the following perks:
      </Text>

      <View style={styles.bulletList}>
        <Text style={styles.bulletPoint}>{'\u2022'} Clean drinking water</Text>
        <Text style={styles.bulletPoint}>{'\u2022'} Ample parking space</Text>
        <Text style={styles.bulletPoint}>{'\u2022'} Quality playing surfaces</Text>
      </View>

      <Text style={styles.aboutText}>Located at Turf Sports Club</Text>

      {showMore && (
        <Text style={styles.aboutText}>
          The turf is managed by professionals who ensure the highest hygiene and maintenance standards.
          Whether you're practicing for a tournament or just enjoying a weekend game, the experience
          here is unmatched.
        </Text>
      )}

<TouchableOpacity
  onPress={() => setShowMore(!showMore)}
  style={{ alignSelf: 'flex-end', marginTop: 4 }}
>
  {/* <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Text style={styles.readMoreText}>Read More</Text>
    <Ionicons name="chevron-down" size={14} color="#007bff" style={{ marginLeft: 4 }} />
  </View> */}
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <Text style={[styles.readMoreText, { textDecorationLine: 'underline', color: '#007bff' }]}>
    Read More
  </Text>
  <Ionicons name="chevron-down" size={14} color="#007bff" style={{ marginLeft: 4 }} />
</View>

</TouchableOpacity>

    </View>
  );
};
const offers = [
    {
      title: 'Get 20% off up to 200',
      subtitle: 'Offer valid till 30th June, 2025',
    },
    {
      title: 'Get 50% off up to 300 (T&C apply*)',
      subtitle: 'Offer valid till 30th June, 2025',
    },
  ];
  
  const OfferCard = () => {
    return (
      <View style={styles.card}>
        <Text style={styles.heading}>Offers</Text>
        {offers.map((offer, index) => (
          <View key={index} style={styles.offerRow}>
            <MaterialCommunityIcons
              name="brightness-percent"
              size={20}
              color="#FF6A00"
              style={styles.icon}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{offer.title}</Text>
              <Text style={styles.subtitle}>{offer.subtitle}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };
  
const AmenitiesSection = () => {
  const amenities = [
    { name: 'Artificial Turf', icon: 'sprout-outline' },
    { name: 'Drinking Water', icon: 'cup-water' },
    { name: 'Seating Lounge', icon: 'sofa' },
  ];

  return (
    <View style={styles.amenitiesContainer}>
      <Text style={styles.sectionTitle}>Amenities</Text>
      <View style={styles.amenitiesWrap}>
        {amenities.map((item, idx) => (
          <View key={idx} style={styles.amenityItem}>
            <MaterialCommunityIcons name={item.icon} size={18} color="#666666" />
            <Text style={styles.amenityLabel}>{item.name}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.viewMoreBtn}>
        <Text style={styles.viewMoreText}>View More</Text>
        <Ionicons name="chevron-down" size={14} color="#007bff" />
      </TouchableOpacity>
    </View>
  );
};
const TurfRulesSection = () => {
  const [showMore, setShowMore] = useState(false);

  return (
    <View style={styles.rulesContainer}>
      <Text style={styles.sectionTitle}>Turf Rules</Text>

      <Text style={styles.rulesHeader}>Rules & Regulations</Text>
      <View style={styles.bulletList}>
        <Text style={styles.bulletPoint}>{'\u2022'} No Smoking Allowed</Text>
        <Text style={styles.bulletPoint}>{'\u2022'} No Alcohol Consumption Allowed</Text>
      </View>

      <Text style={styles.rulesHeader}>Additional Terms & Conditions</Text>
      <Text style={styles.rulesText}>
        Chalo Khelne provides venue slots as allocated and is not liable for any usage that
        {showMore && ' results in injury, loss or damage. All users are responsible for their personal belongings and conduct while using the facility.'}
      </Text>

      <TouchableOpacity
  onPress={() => setShowMore(!showMore)}
  style={{ alignSelf: 'flex-end', marginTop: 4 }}
>

  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <Text style={[styles.readMoreText, { textDecorationLine: 'underline', color: '#007bff' }]}>
    Read More
  </Text>
  <Ionicons name="chevron-down" size={14} color="#007bff" style={{ marginLeft: 4 }} />
</View>

</TouchableOpacity>

    </View>
  );
};




const BookNowButton = () => {
  const [isOrange, setIsOrange] = useState(true);

  
 
    const opacity = useRef(new Animated.Value(1)).current;
  
    const handleSwap = () => {
      setIsOrange(!isOrange);
      // Trigger the blink animation
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();
  
      // Your actual swap logic here
      console.log('Swapped');
    };
  

  return (
    <View style={styles.bcontainer}>
      {isOrange ? (
        <TouchableOpacity style={[styles.button, styles.orangeButton]} onPress={handleSwap}>
          <View style={styles.iconCircle}>
            <Text style={[styles.iconText, { color: '#FF6A00' }]}>{'»'}</Text>
          </View>
          <Text style={styles.buttonText}>Book Now</Text>
        </TouchableOpacity>
      ) : (
        
        <TouchableOpacity style={[styles.button, styles.blueButton]} onPress={handleSwap}>
        <Animated.Text style={[styles.iconText, styles.blueArrowText, { opacity }]}>
          {'»»»»'}
        </Animated.Text>
        <View style={styles.iconCircleRight}>
          <Text style={[styles.iconText1, { color: '#1D6B88' }]}>{'›'}</Text>
        </View>
      </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    top: 50,
    paddingHorizontal: 15,
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f5f7f9',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginLeft: -30,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSpacing: {
    marginRight: 15,
  },
  carouselWrapper: {
    marginTop: 40,
    alignItems: 'center',
  },
  imageWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    height: 250,
  },
  leftArrow: {
    position: 'absolute',
    left: 10,
    top: '45%',
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 5,
    borderRadius: 20,
  },
  rightArrow: {
    position: 'absolute',
    right: 10,
    top: '45%',
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 5,
    borderRadius: 20,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  activeDot: {
    width: 20,
    backgroundColor: '#FF7A00',
    borderRadius: 5,
  },
  venueCard: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  address: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
    marginTop: 2,
    fontFamily: 'Roboto',
    fontWeight: '400',
    letterSpacing: -0.41,
    textAlignVertical: 'center',
  },
  direction: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  distance: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  price: {
    marginTop: 8,
    fontSize: 15,
    color: '#222',
  },
  time: {
    fontSize: 14,
    color: '#222',
  },
  ratingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    color: '#444',
    marginLeft: 6,
  },
  sportsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
  
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8, // adjusted margin for tighter spacing
    color: '#333',
  },
  sportsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    
  },
  sportItem: {
    alignItems: 'center',
    width: 70,
    borderColor: '#1D6A8B',
  },
  
  sportIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25, // half of width/height for circle
    borderWidth: 1,
    borderColor: '#1D6A8B',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E6F0FA', // optional, for a white background
  },
  
  sportLabel: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
  },
  aboutContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
 
  },
  aboutText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666666',
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletList: {
    marginLeft: 10,
    marginBottom: 10,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  readMore: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
  },
  amenitiesContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
  
  },
  readMoreText:{
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
    marginRight:16,
  },
  amenitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f1f4f9',
    borderRadius: 20,
  },
  amenityLabel: {
    fontSize: 13,
    color: '#444',
    marginLeft: 6,
  },
  viewMoreBtn: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewMoreText: {
    color: '#007bff',
    fontSize: 13,
    marginRight: 2, // tightened spacing
    fontWeight: '500',
  },

  rulesContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  
   
  
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 12,
  },
  rulesHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  bulletList: {
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  rulesText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  readMoreText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
  },
  bcontainer: {
  
    alignItems: 'center',
    height:60,
    width:150,
marginLeft:40,
  },
  button: {
  
    marginTop: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    height:50,
    width:320,
    left:60,
  },
  orangeButton: {
    backgroundColor: '#FF6A00',
  },
  blueButton: {
    backgroundColor: '#1D6B88',
    justifyContent: 'space-between',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight:500,
    marginLeft: 82,
    alignItems: 'center',
    marginTop:-5,
  },
  iconText: {
    fontSize: 45,
    fontWeight: 'bold',
    alignItems: 'center',
    marginTop:-11,
    marginLeft:25,
  
  },
  blueArrowText: {
    color: '#FFFFFF',
right:-55,
   fontSize: 45,
    fontWeight: 'bold',
   
    marginTop:-25,
   
  },
  iconCircle: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
   
marginLeft:-10,
    height:40,
    width:66,
  },
  iconCircleRight: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
   
    
    height:40,
    width:66,
    marginRight:-12,
    
  },
  iconText1: {
    fontSize: 45,
    fontWeight: 'bold',
    alignItems: 'center',
    marginTop:-11,
    marginLeft:30,
  
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    elevation: 2, // shadow for Android
    shadowColor: '#000', // shadow for iOS
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  icon: {
    marginRight: 10,
    marginTop: 2,
  },
  title: {
    fontSize: 14,
    color: '#000',
  },
  subtitle: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
});

export { VenueScreen };