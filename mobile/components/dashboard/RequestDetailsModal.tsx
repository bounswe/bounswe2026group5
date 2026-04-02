import React from 'react';
import { View, Text, Modal, TouchableOpacity, Pressable, ScrollView } from 'react-native';

interface RequestDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  request: {
    user: string;
    topic: string;
    type: 'incoming' | 'outgoing';
    message?: string; // The cover letter
    proposedDate?: string;
  } | null;
}

export function RequestDetailsModal({ visible, onClose, request }: RequestDetailsModalProps) {
  if (!request) return null;

  const isIncoming = request.type === 'incoming';

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable 
          onPress={(e) => e.stopPropagation()} 
          className="bg-white w-full rounded-t-3xl p-6 pb-12 shadow-2xl max-h-[80%]"
        >
          
          <View className="items-center mb-6">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </View>

          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-extrabold text-gray-900 mb-1">Mentorship Request</Text>
            <Text className="text-base text-gray-500 font-medium">
              {isIncoming ? `From ${request.user}` : `Sent to ${request.user}`}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
            {/* Topic & Date */}
            <View className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-4">
              <View className="flex-row justify-between mb-3">
                <Text className="text-gray-500 font-medium">Topic</Text>
                <Text className="text-gray-900 font-semibold">{request.topic}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-500 font-medium">Proposed Time</Text>
                <Text className="text-gray-900 font-semibold">{request.proposedDate || 'TBD'}</Text>
              </View>
            </View>

            {/* The Cover Letter Message */}
            <Text className="text-sm font-bold text-gray-900 mb-2">Message</Text>
            <View className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <Text className="text-gray-700 leading-6">
                {request.message || "I would love to book a session with you to discuss this topic!"}
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          {isIncoming ? (
            <View className="flex-row justify-between gap-3 pt-2 border-t border-gray-100">
              <TouchableOpacity 
                className="flex-1 bg-white py-4 rounded-xl items-center border border-gray-300"
                onPress={() => { console.log('Declined'); onClose(); }}
              >
                <Text className="text-gray-700 font-bold text-base">Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="flex-1 bg-blue-600 py-4 rounded-xl items-center"
                onPress={() => { console.log('Accepted'); onClose(); }}
              >
                <Text className="text-white font-bold text-base">Accept Request</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              className="bg-red-50 py-4 rounded-xl items-center mt-2 border border-red-100"
              onPress={() => { console.log('Canceled Outgoing'); onClose(); }}
            >
              <Text className="text-red-600 font-bold text-base">Cancel Request</Text>
            </TouchableOpacity>
          )}

        </Pressable>
      </Pressable>
    </Modal>
  );
}