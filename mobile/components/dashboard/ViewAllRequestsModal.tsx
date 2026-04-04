import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RequestCard } from './RequestCard';
import { type DashboardRequestItem } from '@/lib/queries/mentorship';

interface ViewAllRequestsModalProps {
  visible: boolean;
  requests: DashboardRequestItem[];
  onClose: () => void;
  onSelectRequest: (request: DashboardRequestItem) => void;
}

export function ViewAllRequestsModal({ 
  visible, requests, onClose, onSelectRequest 
}: Readonly<ViewAllRequestsModalProps>) {
  const insets = useSafeAreaInsets();

  const incomingRequests = requests.filter(r => r.type === 'incoming');
  const outgoingRequests = requests.filter(r => r.type === 'outgoing');

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
        
        {/* Header */}
        <View className="flex-row items-center px-4 pb-3 pt-2 bg-white border-b border-gray-100 z-10 shadow-sm">
          <TouchableOpacity 
            onPress={onClose} 
            className="p-2 -ml-2 mr-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#4b5563" />
          </TouchableOpacity>
          <Text className="text-xl font-extrabold text-gray-900">All Requests</Text>
        </View>

        <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          
          {/* Incoming Section */}
          <View className="mb-8">
            <View className="flex-row items-center mb-4">
              <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider mr-2">Action Needed</Text>
              <View className="bg-indigo-100 px-2 py-0.5 rounded-full">
                <Text className="text-xs font-bold text-indigo-700">{incomingRequests.length}</Text>
              </View>
            </View>
            
            {incomingRequests.length === 0 ? (
              <Text className="text-gray-400 italic">No incoming requests right now.</Text>
            ) : (
              incomingRequests.map(req => (
                <RequestCard 
                  key={req.id} 
                  user={req.user} 
                  topic={req.topic} 
                  type={req.type} 
                  isReschedule={req.isReschedule}
                  onPress={() => onSelectRequest(req)} 
                />
              ))
            )}
          </View>

          {/* Outgoing Section */}
          <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider mr-2">Sent Requests</Text>
              <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                <Text className="text-xs font-bold text-emerald-700">{outgoingRequests.length}</Text>
              </View>
            </View>

            {outgoingRequests.length === 0 ? (
              <Text className="text-gray-400 italic">You haven&apos;t sent any mentorship requests.</Text>
            ) : (
              outgoingRequests.map(req => (
                <RequestCard 
                  key={req.id} 
                  user={req.user} 
                  topic={req.topic} 
                  type={req.type} 
                  onPress={() => onSelectRequest(req)} 
                />
              ))
            )}
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
}