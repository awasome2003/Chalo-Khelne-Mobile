import React from "react";
import { View, Text, ScrollView, StyleSheet, Linking, TouchableOpacity } from "react-native";

const PrivacyPolicyScreen = () => {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <Text style={styles.effectiveDate}>Effective Date: 17-04-2025</Text>

        <Text style={styles.paragraph}>
          Welcome to Chalo Khelne! Your privacy is important to us. This Privacy
          Policy explains how we collect, use, disclose, and safeguard your
          information when you use our mobile application and related services.
          Chalo Khelne is a sports management platform available to users of all
          ages, including children. Please read this policy carefully.
        </Text>

        {/* ── 1. Information We Collect ── */}
        <Text style={styles.heading}>1. Information We Collect</Text>

        <Text style={styles.subHeading}>a) Personal Information</Text>
        <Text style={styles.paragraph}>
          • Name{"\n"}
          • Email address{"\n"}
          • Phone number{"\n"}
          • Date of birth (required for age verification and child safety){"\n"}
          • Profile picture (optional){"\n"}
          • Gender (optional)
        </Text>

        <Text style={styles.subHeading}>b) Communications Data</Text>
        <Text style={styles.paragraph}>
          • Chat messages exchanged between users{"\n"}
          • Group chat messages and member information{"\n"}
          • Social feed posts, comments, and interactions
        </Text>

        <Text style={styles.subHeading}>c) Media and Files</Text>
        <Text style={styles.paragraph}>
          • Photos and images shared in chats or social feed{"\n"}
          • Profile pictures uploaded by users{"\n"}
          • Documents and certificates (for trainer/referee profiles)
        </Text>

        <Text style={styles.subHeading}>d) Device and Usage Information</Text>
        <Text style={styles.paragraph}>
          • Device type, operating system, and app version{"\n"}
          • Push notification tokens (for delivering notifications){"\n"}
          • Usage patterns and session data{"\n"}
          • Location data (if enabled, for finding nearby venues)
        </Text>

        <Text style={styles.subHeading}>e) Payment Information</Text>
        <Text style={styles.paragraph}>
          • Payment transactions are processed securely through Razorpay. We do
          not store your credit card, debit card, or bank account details on our
          servers. Razorpay handles all payment data in accordance with PCI-DSS
          standards. We only store transaction IDs and booking confirmations.
        </Text>

        {/* ── 2. How We Use Your Information ── */}
        <Text style={styles.heading}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          • To provide sports management services (venue booking, tournaments,
          player profiles){"\n"}
          • To enable social features including chat, messaging, and social
          feed between users{"\n"}
          • To verify user age and enforce appropriate safety measures{"\n"}
          • To enforce parental controls for minor users{"\n"}
          • To send push notifications about bookings, matches, and updates{"\n"}
          • To process payments for venue bookings and services{"\n"}
          • To display user profiles within the app community{"\n"}
          • To improve app performance and user experience{"\n"}
          • To ensure a safe and secure environment for all users
        </Text>

        {/* ── 3. Camera and Media Permissions ── */}
        <Text style={styles.heading}>3. Camera and Media Permissions</Text>
        <Text style={styles.paragraph}>
          Our app requests access to your device camera and photo library for the
          following purposes only:{"\n\n"}
          • Uploading a profile picture{"\n"}
          • Sharing photos in chat conversations{"\n"}
          • Posting images to the social feed{"\n"}
          • Uploading certificates or documents for trainer/referee verification
          {"\n\n"}
          Camera and media access is entirely optional. You can use the app
          without granting these permissions, though some features (like photo
          sharing) will be unavailable. We never access your camera or photo
          library in the background.
        </Text>

        {/* ── 4. Push Notifications ── */}
        <Text style={styles.heading}>4. Push Notifications</Text>
        <Text style={styles.paragraph}>
          We use push notifications to inform you about:{"\n\n"}
          • Match schedules and tournament updates{"\n"}
          • Booking confirmations and reminders{"\n"}
          • New chat messages{"\n"}
          • Important announcements{"\n\n"}
          You can disable push notifications at any time through your device
          settings. Disabling notifications does not affect your ability to use
          the app.
        </Text>

        {/* ── 5. Child Safety ── */}
        <Text style={styles.heading}>5. Child Safety</Text>
        <Text style={styles.paragraph}>
          Chalo Khelne is available to users of all ages, including children. We
          take the safety of young users very seriously and have implemented the
          following measures:
        </Text>

        <Text style={styles.subHeading}>Age Verification</Text>
        <Text style={styles.paragraph}>
          • Date of birth is collected during registration to determine the
          user's age group{"\n"}
          • Users under 13 years of age require parental consent to create an
          account{"\n"}
          • Users aged 13–17 are automatically classified as minors with
          default safety restrictions enabled{"\n"}
          • Users aged 18 and above have full access to all features
        </Text>

        <Text style={styles.subHeading}>Automatic Restrictions for Minors</Text>
        <Text style={styles.paragraph}>
          • Users under 18 have parental controls enabled by default{"\n"}
          • Social features (chat, social feed, media sharing) can be
          restricted or disabled by a parent or guardian{"\n"}
          • A safety reminder is shown before any social interaction{"\n"}
          • We do not allow unsupervised contact between unknown adults and
          child users when parental controls are active
        </Text>

        <Text style={styles.subHeading}>Parental Controls</Text>
        <Text style={styles.paragraph}>
          • Parents or guardians can set a 4-digit PIN to control access to
          social features{"\n"}
          • Parental controls allow toggling on/off:{"\n"}
          {"  "}– Chat and messaging{"\n"}
          {"  "}– Social feed access{"\n"}
          {"  "}– Media and photo sharing{"\n"}
          • Parents can modify or disable these controls at any time{"\n"}
          • Parental control settings are synced across devices
        </Text>

        <Text style={styles.subHeading}>Safety Reminders</Text>
        <Text style={styles.paragraph}>
          • A safety reminder is displayed before users access chat or social
          features for the first time each session{"\n"}
          • Users are reminded not to share personal information online{"\n"}
          • Users are informed about the real-world risks of online interactions
        </Text>

        {/* ── 6. Social Features Safety ── */}
        <Text style={styles.heading}>6. Social Features Safety</Text>
        <Text style={styles.paragraph}>
          Our app includes social features such as chat messaging, group chats,
          and a social feed. We have implemented the following safeguards:{"\n\n"}
          • In-app safety reminders are shown before users interact with social
          features{"\n"}
          • Parental PIN protection is available to restrict social feature
          access{"\n"}
          • No personal information (phone number, address) is required or
          displayed in chat{"\n"}
          • Group chat management allows owners to control membership{"\n"}
          • Users can report inappropriate content or behavior{"\n"}
          • Parents can fully disable all social features for their child's
          account
        </Text>

        {/* ── 7. Data Sharing and Disclosure ── */}
        <Text style={styles.heading}>7. Data Sharing and Disclosure</Text>
        <Text style={styles.paragraph}>
          We do NOT sell, trade, or rent your personal information to third
          parties. We do NOT share child user data with any third parties for
          marketing or advertising purposes.{"\n\n"}
          Information may be shared only in the following circumstances:{"\n\n"}
          • With Razorpay for processing payments securely{"\n"}
          • With push notification services (Expo) to deliver app notifications
          {"\n"}
          • When required by law or to comply with legal processes{"\n"}
          • To protect the safety of our users, including children{"\n"}
          • With your explicit consent
        </Text>

        {/* ── 8. Data Security ── */}
        <Text style={styles.heading}>8. Data Security</Text>
        <Text style={styles.paragraph}>
          We take reasonable and appropriate security measures to protect your
          personal information from unauthorized access, alteration, disclosure,
          or destruction. These measures include:{"\n\n"}
          • Encrypted password storage using bcrypt hashing{"\n"}
          • Encrypted parental control PINs{"\n"}
          • Secure HTTPS connections for all data transfers{"\n"}
          • Token-based authentication (JWT){"\n\n"}
          However, no method of electronic transmission or storage is 100%
          secure. We cannot guarantee absolute security but are committed to
          protecting your data.
        </Text>

        {/* ── 9. Data Retention ── */}
        <Text style={styles.heading}>9. Data Retention</Text>
        <Text style={styles.paragraph}>
          • Account information is retained as long as your account is active
          {"\n"}
          • Chat messages are retained while the conversation or group exists
          {"\n"}
          • Usage and analytics data is retained for up to 90 days{"\n"}
          • If you request account deletion, your personal data will be deleted
          or anonymized within 30 days, unless retention is required by law
        </Text>

        {/* ── 10. Parental Rights ── */}
        <Text style={styles.heading}>10. Parental Rights</Text>
        <Text style={styles.paragraph}>
          Parents and guardians of minor users have the following rights:{"\n\n"}
          • Request access to their child's personal data{"\n"}
          • Request deletion of their child's account and all associated data
          {"\n"}
          • Disable all social features (chat, social feed, media sharing) at
          any time using parental controls{"\n"}
          • Set and modify a parental PIN to control feature access{"\n"}
          • Withdraw consent for data processing{"\n\n"}
          To exercise any of these rights, please contact us at
          support@chalokhelne.com. We will respond within 48 hours.
        </Text>

        {/* ── 11. Your Rights ── */}
        <Text style={styles.heading}>11. Your Rights</Text>
        <Text style={styles.paragraph}>
          All users have the right to:{"\n\n"}
          • Access and review personal information we hold{"\n"}
          • Update or correct your personal data{"\n"}
          • Request deletion of your account and data{"\n"}
          • Withdraw consent for data processing{"\n"}
          • Opt-out of push notifications{"\n"}
          • Opt-out of marketing communications{"\n\n"}
          To exercise these rights, contact us at support@chalokhelne.com.
        </Text>

        {/* ── 12. Third-Party Links ── */}
        <Text style={styles.heading}>12. Third-Party Links</Text>
        <Text style={styles.paragraph}>
          Our app may contain links to third-party websites or services
          (including payment processors). We are not responsible for the privacy
          practices of these external services and encourage you to review their
          privacy policies.
        </Text>

        {/* ── 13. Updates to This Policy ── */}
        <Text style={styles.heading}>13. Updates to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. Changes will be
          reflected by updating the "Effective Date" at the top of this page. We
          encourage you to review this policy periodically. Continued use of the
          app after updates constitutes acceptance of the revised terms.
        </Text>

        {/* ── 14. Contact Us ── */}
        <Text style={styles.heading}>14. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions, concerns, or requests regarding this Privacy
          Policy or the safety of your child's account, please contact us:
        </Text>
        <Text style={styles.paragraph}>
          Email: support@chalokhelne.com{"\n"}
          Phone: 9272090926{"\n"}
          Response time: Within 48 hours
        </Text>

        <TouchableOpacity onPress={() => Linking.openURL("mailto:support@chalokhelne.com")}>
          <Text style={styles.emailLink}>support@chalokhelne.com</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  effectiveDate: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 5,
    color: "#333",
  },
  subHeading: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 3,
    color: "#444",
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: "#555",
    marginBottom: 10,
  },
  emailLink: {
    fontSize: 15,
    color: "#004E93",
    textDecorationLine: "underline",
    marginTop: 4,
    marginBottom: 20,
  },
});

export default PrivacyPolicyScreen;
