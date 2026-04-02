import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, Modal, TouchableOpacity, ScrollView, 
  KeyboardAvoidingView, Platform, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Offering } from './MentorshipOfferings';
import type { AvailabilitySlot } from './AvailabilityPreview';
interface BookingModalProps {
  visible: boolean;
  onClose: () => void;
  offering: Offering | null;
  availability: AvailabilitySlot[]; 
  existingSession?: { date: string; time: string };
}

const MAX_COVER_LETTER_LENGTH = 300;

export function BookingModal({ visible, onClose, offering, availability, existingSession }: BookingModalProps) {
  const insets = useSafeAreaInsets();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedDateObj, setSelectedDateObj] = useState<{date: string, dayOfWeek: string, rawDate: string} | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null); 
  const [coverLetter, setCoverLetter] = useState('');
  
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [customStartTime, setCustomStartTime] = useState('10:00');
  const [customEndTime, setCustomEndTime] = useState('11:00');

  useEffect(() => {
    if (visible) {
      setStep(1);
      setSelectedDateObj(null);
      setSelectedSlot(null);
      setIsCustomTime(false);
      setCustomStartTime('10:00');
      setCustomEndTime('11:00');
      setCoverLetter('');
      setIsLoading(false);
    }
  }, [visible]);

  const handleCloseWithWarning = () => {
    // If they selected a date, proposed a custom time, or wrote a letter, it is "half filled"
    const hasUnsavedChanges = selectedDateObj !== null || isCustomTime || coverLetter.length > 0;
    
    if (hasUnsavedChanges && !isLoading) {
      Alert.alert(
        'Discard Request?',
        'You have unsaved changes. Are you sure you want to discard this and go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose }
        ]
      );
    } else {
      onClose();
    }
  };

  // The Undeletable Colon Formatter
  const handleTimeInput = (text: string, setTime: (val: string) => void) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`;
    }
    setTime(formatted);
  };

  // Dynamically generate the next 14 days and filter by availability
  const availableDates = useMemo(() => {
    const dates = [];
    const today = new Date(); // Dynamically grabs today's date
    
    // Generate the next 14 days
    for (let i = 1; i <= 14; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      
      dates.push({
        date: nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dayOfWeek: nextDate.toLocaleDateString('en-US', { weekday: 'long' }),
        rawDate: nextDate.toISOString().split('T')[0] // Keep the exact YYYY-MM-DD for the reschedule check
      });
    }

    // Filter to only show days that match the mentor's availability schedule
    return dates.filter(d => 
      availability.some(a => a.day === d.dayOfWeek && a.times.length > 0)
    );
  }, [availability]);

  const dynamicSlots = useMemo(() => {
    if (!selectedDateObj) return [];
    const daySchedule = availability.find(a => a.day === selectedDateObj.dayOfWeek);
    if (!daySchedule) return [];

    const generatedSlots: string[] = [];
    daySchedule.times.forEach(block => {
      const [start, end] = block.split(' - ');
      const startHour = parseInt(start.split(':')[0]);
      const endHour = parseInt(end.split(':')[0]);

      for (let i = startHour; i < endHour; i++) {
         const formattedStart = `${i.toString().padStart(2, '0')}:00`;
         const formattedEnd = `${(i+1).toString().padStart(2, '0')}:00`;
         generatedSlots.push(`${formattedStart} - ${formattedEnd}`);
      }
    });
    return generatedSlots;
  }, [selectedDateObj, availability]);

  if (!offering) return null;

  const validateTimeAndProceed = () => {
    if (!selectedDateObj) {
      Alert.alert('Missing Date', 'Please select a date for the session.');
      return;
    }
    if (!isCustomTime && !selectedSlot) {
      Alert.alert('Missing Time', 'Please select an available slot or propose a custom time.');
      return;
    }
    if (isCustomTime) {
      const isValidTime = (time: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
      if (!isValidTime(customStartTime) || !isValidTime(customEndTime)) {
        Alert.alert('Invalid Format', 'Please use a valid 24-hour format (e.g., 09:00, 14:30).');
        return;
      }
      const timeToMinutes = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return (hours * 60) + minutes;
      };
      if (timeToMinutes(customStartTime) >= timeToMinutes(customEndTime)) {
        Alert.alert('Invalid Time Range', 'The start time must be strictly before the end time.');
        return;
      }
    }
    if (existingSession) {
      const proposedTime = isCustomTime ? `${customStartTime} - ${customEndTime}` : selectedSlot;
      // FIX: Use rawDate for the strict comparison
      if (selectedDateObj.rawDate === existingSession.date && proposedTime === existingSession.time) {
        Alert.alert(
          'No Change Detected', 
          'You selected the exact same date and time as your current session. Please select a new slot to reschedule.'
        );
        return;
      }
    }
    setStep(2);
  };

  const handleSubmitRequest = () => {
    if (coverLetter.trim().length < 10) {
      Alert.alert('Cover Letter too short', 'Please provide a bit more detail about what you want to discuss.');
      return;
    }
    setIsLoading(true);
    const finalTime = isCustomTime ? `${customStartTime} - ${customEndTime}` : selectedSlot;

    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        'Request Sent!', 
        `Your request for ${offering.title} on ${selectedDateObj?.date} at ${finalTime} has been sent.`,
        [{ text: 'Great', onPress: onClose }]
      );
    }, 1500);
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-100 mb-2">
          <TouchableOpacity 
            onPress={() => step === 2 ? setStep(1) : handleCloseWithWarning()}            
            className="p-2 -ml-2" 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={isLoading}
          >
            <Ionicons name={step === 2 ? "arrow-back" : "close"} size={24} color="#4b5563" />
          </TouchableOpacity>
          <Text className="text-xl font-extrabold text-gray-900">
            {step === 1 ? 'Select Time' : 'Cover Letter'}
          </Text>
          <View className="w-8" />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6" keyboardShouldPersistTaps="handled">
            
            {/* THE OFFERING SUMMARY CARD */}
            <View className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-8 mt-4">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm mr-3">
                  <Ionicons name={offering.icon as any} size={20} color="#4f46e5" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900">{offering.title}</Text>
                  <Text className="text-indigo-600 font-semibold">{offering.duration} • {offering.level}</Text>
                </View>
              </View>
              <Text className="text-gray-700 leading-5">
                {offering.description || "A comprehensive mentorship session tailored to your needs."}
              </Text>
            </View>

            {/* STEP 1: DATE & TIME PROPOSAL */}
            {step === 1 && (
              <View className="pb-12">
                <Text className="text-base font-bold text-gray-900 mb-3">1. Select a Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 -mx-6 px-6">
                  {availableDates.length === 0 ? (
                    <Text className="text-gray-500 italic">No available dates found.</Text>
                  ) : (
                    availableDates.map((dateObj) => {
                      const isSelected = selectedDateObj?.date === dateObj.date;
                      return (
                        <TouchableOpacity
                          key={dateObj.date}
                          activeOpacity={0.9} // <-- FIX: Stops the optical illusion
                          onPress={() => {
                            setSelectedDateObj(dateObj);
                            setSelectedSlot(null); 
                          }}
                          className={isSelected ? "mr-3 py-3 px-5 rounded-xl border bg-indigo-600 border-indigo-600" : "mr-3 py-3 px-5 rounded-xl border bg-white border-gray-200"}
                        >
                          <Text className={`font-bold ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                            {dateObj.date}
                          </Text>
                          <Text className={`text-xs mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-gray-400'}`}>
                            {dateObj.dayOfWeek}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>

                {selectedDateObj && (
                  <View>
                    <Text className="text-base font-bold text-gray-900 mb-3">2. Select an Available Slot</Text>
                    
                    {dynamicSlots.length === 0 ? (
                      <Text className="text-gray-500 italic mb-4">No slots available for this day.</Text>
                    ) : (
                      <View className="flex-row flex-wrap gap-3 mb-4">
                        {dynamicSlots.map((slot) => {
                          const isSelected = !isCustomTime && selectedSlot === slot;
                          return (
                            <TouchableOpacity
                              key={slot}
                              activeOpacity={0.9} // <-- FIX
                              onPress={() => {
                                setSelectedSlot(slot);
                                setIsCustomTime(false);
                              }}
                              className={isSelected ? "py-3 px-4 rounded-xl border w-[47%] items-center bg-indigo-600 border-indigo-600" : "py-3 px-4 rounded-xl border w-[47%] items-center bg-white border-gray-200"}
                            >
                              <Text className={`font-bold ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                                {slot}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    <View className="flex-row items-center mb-4 mt-2">
                      <View className="flex-1 h-[1px] bg-gray-200" />
                      <Text className="text-xs font-bold text-gray-400 px-3 uppercase tracking-wider">OR</Text>
                      <View className="flex-1 h-[1px] bg-gray-200" />
                    </View>

                    <TouchableOpacity 
                      activeOpacity={0.9} // <-- FIX
                      onPress={() => {
                        setIsCustomTime(true);
                        setSelectedSlot(null);
                      }}
                      className={isCustomTime ? "py-4 rounded-xl items-center border bg-indigo-600 border-indigo-600" : "py-4 rounded-xl items-center border bg-white border-gray-200"}
                    >
                      <Text className={`font-bold ${isCustomTime ? 'text-white' : 'text-gray-700'}`}>
                        Propose Another Time
                      </Text>
                    </TouchableOpacity>

                    {isCustomTime && (
                      <View className="flex-row items-center gap-4 mt-4">
                        <View className="flex-1">
                          <Text className="text-xs font-bold text-gray-500 mb-1 ml-1">Start Time</Text>
                          <TextInput 
                            value={customStartTime}
                            onChangeText={(val) => handleTimeInput(val, setCustomStartTime)}
                            keyboardType="number-pad"
                            maxLength={5}
                            className="bg-white border border-gray-200 py-4 px-4 rounded-xl text-center text-gray-900 font-bold text-lg"
                          />
                        </View>
                        <Text className="text-gray-400 font-bold mt-4">-</Text>
                        <View className="flex-1">
                          <Text className="text-xs font-bold text-gray-500 mb-1 ml-1">End Time</Text>
                          <TextInput 
                            value={customEndTime}
                            onChangeText={(val) => handleTimeInput(val, setCustomEndTime)}
                            keyboardType="number-pad"
                            maxLength={5}
                            className="bg-white border border-gray-200 py-4 px-4 rounded-xl text-center text-gray-900 font-bold text-lg"
                          />
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* STEP 2: COVER LETTER FORM */}
            {step === 2 && (
              <View className="pb-12 mt-2">
                <View className="flex-row justify-between items-end mb-2 ml-1 mr-1">
                  <Text className="text-base font-bold text-gray-900">Add a Cover Letter</Text>
                  <Text className={`text-xs font-bold ${coverLetter.length >= MAX_COVER_LETTER_LENGTH ? 'text-red-500' : 'text-gray-400'}`}>
                    {coverLetter.length}/{MAX_COVER_LETTER_LENGTH}
                  </Text>
                </View>
                <TextInput
                  value={coverLetter}
                  onChangeText={setCoverLetter}
                  placeholder="Introduce yourself and explain what you'd like to achieve in this session..."
                  multiline={true}
                  maxLength={MAX_COVER_LETTER_LENGTH}
                  textAlignVertical="top"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900 h-48"
                />
              </View>
            )}

          </ScrollView>
        </KeyboardAvoidingView>

        {/* BOTTOM ACTION BUTTON */}
        <View className="px-6 py-4 border-t border-gray-100">
          {step === 1 ? (
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={validateTimeAndProceed}
              className="bg-gray-900 py-4 rounded-xl items-center shadow-sm"
            >
              <Text className="text-lg font-bold text-white">Continue</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={handleSubmitRequest}
              disabled={isLoading}
              className={`py-4 rounded-xl items-center shadow-sm flex-row justify-center ${isLoading ? 'bg-indigo-400' : 'bg-indigo-600'}`}
            >
              {isLoading ? (
                <ActivityIndicator color="white" className="mr-2" />
              ) : null}
              <Text className="text-lg font-bold text-white">
                {isLoading ? 'Sending Request...' : 'Send Request'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

      </View>
    </Modal>
  );
}