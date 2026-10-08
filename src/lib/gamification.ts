import { doc, updateDoc, increment, getDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

export const POINTS = {
  REPORT_ISSUE: 10,
  ISSUE_RESOLVED: 25,
  RECEIVE_UPVOTE: 2,
};

export const BADGES = {
  NEW_REPORTER: { id: 'new_reporter', threshold: 1 },
  TOP_CONTRIBUTOR: { id: 'top_contributor', threshold: 10 },
  SUPER_CITIZEN: { id: 'super_citizen', threshold: 50 },
  COMMUNITY_VOICE: { id: 'community_voice', upvoteThreshold: 100 },
};

export const updateUserPoints = async (userId: string, points: number) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      points: increment(points),
    });
  } catch (error) {
    console.error('Error updating user points:', error);
  }
};

export const checkAndAwardBadges = async (userId: string, reportCount: number, upvoteCount: number) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const currentBadges = userDoc.data()?.badges || [];

    const newBadges: string[] = [];

    // Check report-based badges
    if (reportCount >= BADGES.NEW_REPORTER.threshold && !currentBadges.includes(BADGES.NEW_REPORTER.id)) {
      newBadges.push(BADGES.NEW_REPORTER.id);
    }
    if (reportCount >= BADGES.TOP_CONTRIBUTOR.threshold && !currentBadges.includes(BADGES.TOP_CONTRIBUTOR.id)) {
      newBadges.push(BADGES.TOP_CONTRIBUTOR.id);
    }
    if (reportCount >= BADGES.SUPER_CITIZEN.threshold && !currentBadges.includes(BADGES.SUPER_CITIZEN.id)) {
      newBadges.push(BADGES.SUPER_CITIZEN.id);
    }

    // Check upvote-based badge
    if (upvoteCount >= BADGES.COMMUNITY_VOICE.upvoteThreshold && !currentBadges.includes(BADGES.COMMUNITY_VOICE.id)) {
      newBadges.push(BADGES.COMMUNITY_VOICE.id);
    }

    // Award new badges
    if (newBadges.length > 0) {
      await updateDoc(userRef, {
        badges: arrayUnion(...newBadges),
      });
    }
  } catch (error) {
    console.error('Error checking and awarding badges:', error);
  }
};

export const createNotification = async (
  userId: string,
  issueId: string,
  issueTitle: string,
  message: string
) => {
  try {
    const notificationsRef = doc(db, 'notifications', `${userId}_${issueId}_${Date.now()}`);
    await setDoc(notificationsRef, {
      userId,
      issueId,
      issueTitle,
      message,
      read: false,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};
