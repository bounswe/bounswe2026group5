import React from 'react';
import { View, Text, Modal, TouchableOpacity, Pressable } from 'react-native';

interface SessionDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  session: {
    user: string;
    date: string;
    time: string;
    status: string;
    topic?: string; 
    myRole?: string;
    location?: string; 
    meetingUrl?: string; 
  } | null;
}

export function SessionDetailsModal({ visible, onClose, session }: SessionDetailsModalProps) {
  if (!session) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable 
        className="flex-1 bg-black/40 justify-end" 
        onPress={onClose}
      >
        <Pressable 
          onPress={(e) => e.stopPropagation()} 
          className="bg-white w-full rounded-t-3xl p-6 pb-12 shadow-2xl"
        >
          
          <View className="items-center mb-6">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </View>

          {/* Header Area */}
          <View className="flex-row justify-between items-start mb-1">
            <Text className="text-2xl font-extrabold text-gray-900 flex-1 pr-2">
              {session.topic || 'Mentorship Session'}
            </Text>
            <View className={`px-3 py-1 rounded-full ${session.myRole === 'Mentor' ? 'bg-indigo-100' : 'bg-emerald-100'}`}>
              <Text className={`text-xs font-bold uppercase tracking-wider ${session.myRole === 'Mentor' ? 'text-indigo-700' : 'text-emerald-700'}`}>
                As {session.myRole}
              </Text>
            </View>
          </View>
          
          <Text className="text-lg text-gray-500 mb-6 font-medium">with {session.user}</Text>

          {/* Details Box */}
          <View className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-8">
            <View className="flex-row justify-between mb-3">
              <Text className="text-gray-500 font-medium">Date</Text>
              <Text className="text-gray-900 font-semibold">{session.date}</Text>
            </View>
            <View className="flex-row justify-between mb-3">
              <Text className="text-gray-500 font-medium">Start Time</Text>
              <Text className="text-gray-900 font-semibold">{session.time}</Text>
            </View>
            
            {/* Display Location OR Platform in the details box */}
            <View className="flex-row justify-between mb-3">
              <Text className="text-gray-500 font-medium">{session.location ? 'Location' : 'Platform'}</Text>
              <Text className="text-gray-900 font-semibold text-right flex-1 ml-4" numberOfLines={1}>
                {session.location || 'Video Call'}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-gray-500 font-medium">Status</Text>
              <Text className={`font-bold ${
                session.status === 'Upcoming' ? 'text-green-600' : 
                session.status === 'Pending' ? 'text-amber-600' : 'text-gray-600'
              }`}>
                {session.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Dynamic Primary Action Button */}
          {session.location ? (
            <TouchableOpacity 
              className="bg-blue-600 py-4 rounded-xl items-center mb-3 shadow-sm"
              onPress={() => console.log(`TODO: Open Maps for ${session.location}`)}
            >
              <Text className="text-white font-bold text-lg">Get Directions</Text>
            </TouchableOpacity>
          ) : session.meetingUrl ? (
            <TouchableOpacity 
              className="bg-blue-600 py-4 rounded-xl items-center mb-3 shadow-sm"
              onPress={() => console.log(`TODO: Open Link ${session.meetingUrl}`)}
            >
              <Text className="text-white font-bold text-lg">Join Video Call</Text>
            </TouchableOpacity>
          ) : null}
          
          {/* Your updated Secondary Action */}
          <View className="flex-row justify-between gap-3 mb-2 mt-2">
            <TouchableOpacity 
              className="flex-1 bg-white py-3 rounded-xl items-center border border-gray-300"
              onPress={() => console.log('TODO: Trigger Reschedule Flow')}
            >
              <Text className="text-gray-700 font-bold text-base">Reschedule</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-1 bg-white py-3 rounded-xl items-center border border-gray-300"
              onPress={() => console.log('TODO: Trigger Cancel Flow')}
            >
              <Text className="text-gray-700 font-bold text-base">Cancel</Text>
            </TouchableOpacity>
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  );
}