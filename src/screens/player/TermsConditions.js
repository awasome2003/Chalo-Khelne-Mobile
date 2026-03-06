import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';

const termsData = [
  {
    heading: 'Effective Date',
    content: '06-12-2024',
  },
  {
    heading: 'Introduction',
    content: `You have accessed our app (App) and/or our Website www.chalokhelne.com (Website). The domain name Chalo Khelne is owned by Bhalchandraya Innovative Services Private Limited, a private company incorporated under the (Indian) Companies Act, 2013 bearing CIN U72900PN2022PTC211674 and its registration number is 211674. The Website and/or App are internet-based portals developed by Baranwal Consultancy and Services...`,
  },
  {
    heading: 'Amendment',
    content: `Chalo Khelne reserves the right, at its sole discretion, to change, modify, add or remove portions of these Terms of Use, at any time without any prior written notice to You...`,
  },
  {
    heading: 'Eligibility To Use',
    content: `Use of the Website and/or App is available only to persons who can form legally binding contracts under Indian Contract Act, 1872...`,
  },
  {
    heading: 'Acceptance of Terms',
    content: `By using Chalo Khelne, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.`,
  },
  {
    heading: 'User Account',
    content: `You shall have to apply for registration as a User to use our Website and/or App...`,
  },
  {
    heading: 'Termination / Suspension of Account',
    content: `We reserve the right to terminate or suspend Your Account and/or suspend Your access to the Services under certain circumstances...`,
  },
  {
    heading: 'User Obligations',
    content: `You agree to use the Services, Website and/or App and the content provided therein only for purposes that are permitted by these Terms of Use...`,
  },
  {
    heading: 'Intellectual Property',
    content: `The Website and/or App and the processes, and their selection and arrangement, including but not limited to Software used to access the Services, all text, graphics, User interfaces, visual interfaces, sounds (if any), artwork and computer code on the Website and/or App are protected by rights...`,
  },
  {
    heading: 'Third-Party Services',
    content: `The Website and/or App may contain links to other Websites and/or App (Linked Sites)...`,
  },
  {
    heading: 'Limitation of Liability',
    content: `Chalo Khelne is provided "as is" without any warranties, express or implied. We are not liable for any direct, indirect, incidental, or consequential damages arising from your use of the app.`,
  },
  {
    heading: 'Indemnification',
    content: `You agree to indemnify, defend and hold harmless Chalo Khelne from and against any and all losses, liabilities, claims, damages, costs and expenses...`,
  },
  {
    heading: 'Changes to Terms',
    content: `We may update these Terms and Conditions from time to time. We will notify users of any significant changes...`,
  },
  {
    heading: 'Compliance with Laws',
    content: `You shall be solely responsible for compliance of all statutes, enactments, acts of legislature or parliament...`,
  },
  {
    heading: 'Contact Us',
    content: `Email: sales@chalokhelne.com\nPhone: +91 9272090926`,
  },
];

const HelpSupportTermsScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {termsData.map((section, index) => (
          <View key={index} style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HelpSupportTermsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111',
  },
  sectionContent: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});
