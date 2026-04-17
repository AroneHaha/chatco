import { useState, useEffect } from "react";
import { DriverData, FeedbackPayload } from "./types";

// Mock Driver Data (In real app, this comes from scanning the Unit QR)
const MOCK_DRIVER: DriverData = {
  id: "d_001",
  name: "Juan Dela Cruz",
  plateNumber: "ABC 1234",
  conductorName: "Pedro Penduko",
  route: "Calumpit - Meycauayan"
};

const POSITIVE_TAGS = [
    "Safe Driving", 
    "Polite", 
    "Clean Vehicle", 
    "Smooth Ride", 
    "Helpful",
    "Alert",
    "Quick to Respond"
];

const NEGATIVE_TAGS = [
  "Reckless Driving", 
  "Rude Behavior", 
  "Dirty Vehicle", 
  "Loud Music", 
  "Overspeeding", 
  "Rough Driving",
  "Distracted",
  "Overloading"        
];

export function useFeedback() {
  const [isScanning, setIsScanning] = useState(true); // Starts true immediately!
  const [driver, setDriver] = useState<DriverData | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const activeTags = rating >= 4 ? POSITIVE_TAGS : NEGATIVE_TAGS;

  // --- MOCK QR SCANNER ---
  // In real app: Replace this useEffect with your camera library's onScanSuccess callback.
  useEffect(() => {
    if (!isScanning) return;

    // Simulate the 3 seconds it takes to find and scan the QR code
    const timer = setTimeout(() => {
      setDriver(MOCK_DRIVER); // Data comes from the scanned QR
      setIsScanning(false);   // Close scanner
      setRating(0);
      setSelectedTags([]);
      setComment("");
      setIsSubmitted(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isScanning]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSetRating = (val: number) => {
    setRating(val);
    setSelectedTags([]); // Reset tags when rating changes
  };

  const submitFeedback = async () => {
    if (!driver || rating === 0) return;
    
    setIsSubmitting(true);
    
    // Mock API Call: POST /api/feedback
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const payload: FeedbackPayload = {
      driverId: driver.id,
      rating,
      tags: selectedTags,
      comment
    };
    
    console.log("Feedback Submitted to Backend:", payload);
    
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const resetForNewScan = () => {
    setIsScanning(true); // Reopens the scanner
    setDriver(null);
  };

  return {
    isScanning, driver, rating, hoverRating, setHoverRating, handleSetRating,
    activeTags, selectedTags, toggleTag, comment, setComment,
    isSubmitting, isSubmitted, resetForNewScan, submitFeedback // <-- Add it right here!
  };
}