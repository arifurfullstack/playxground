import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, ArrowLeft, User, MessageSquare, Image, X, Loader2, Video, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Conversation {
  id: string;
  creator_id: string;
  fan_id: string;
  last_message_at: string;
  other_user: Profile;
  last_message?: string;
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  media_url?: string | null;
  media_type?: string | null;
}

export default function Messages() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markMessagesAsRead(selectedConversation.id).then(() => {
        // Update the unread count in the conversations list
        setConversations(prev => 
          prev.map(conv => 
            conv.id === selectedConversation.id 
              ? { ...conv, unread_count: 0 } 
              : conv
          )
        );
      });
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          if (newMsg.sender_id !== user?.id) {
            markMessagesAsRead(selectedConversation.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === updatedMsg.id ? { ...msg, is_read: updatedMsg.is_read } : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, user]);

  // Typing indicator channel
  useEffect(() => {
    if (!selectedConversation || !user) return;

    const channelName = `typing-${selectedConversation.id}`;
    
    const channel = supabase.channel(channelName)
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId !== user.id) {
          setIsOtherUserTyping(true);
          
          // Clear previous timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          
          // Hide typing indicator after 2 seconds of no typing events
          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherUserTyping(false);
          }, 2000);
        }
      })
      .on('broadcast', { event: 'stop_typing' }, (payload) => {
        if (payload.payload.userId !== user.id) {
          setIsOtherUserTyping(false);
        }
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
    };
  }, [selectedConversation, user]);

  const sendTypingEvent = useCallback(() => {
    if (!typingChannelRef.current || !user) return;
    
    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id }
    });
  }, [user]);

  const sendStopTypingEvent = useCallback(() => {
    if (!typingChannelRef.current || !user) return;
    
    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'stop_typing',
      payload: { userId: user.id }
    });
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (e.target.value.trim()) {
      sendTypingEvent();
    } else {
      sendStopTypingEvent();
    }
  };

  const fetchConversations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return;
    }

    // Fetch other user profiles for each conversation
    const conversationsWithProfiles = await Promise.all(
      (data || []).map(async (conv) => {
        const otherUserId = conv.creator_id === user.id ? conv.fan_id : conv.creator_id;
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('id', otherUserId)
          .single();

        // Get last message
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get unread count
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .neq('sender_id', user.id);

        return {
          ...conv,
          other_user: profileData || { id: otherUserId, username: 'Unknown', display_name: null, avatar_url: null },
          last_message: lastMsg?.content,
          unread_count: count || 0,
        };
      })
    );

    setConversations(conversationsWithProfiles);
    setLoading(false);
  };

  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const markMessagesAsRead = async (conversationId: string) => {
    if (!user) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('is_read', false);
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    // Validate file type
    if (!isImage && !isVideo) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image or video file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB for images, 50MB for videos)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: isVideo ? 'Video must be less than 50MB' : 'Image must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedMedia(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const clearSelectedMedia = () => {
    setSelectedMedia(null);
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
      setMediaPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('message-media')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('message-media')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedMedia) || !selectedConversation || !user || sendingMessage) return;

    sendStopTypingEvent();
    setSendingMessage(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    // Upload media if selected
    if (selectedMedia) {
      setUploadingMedia(true);
      mediaUrl = await uploadMedia(selectedMedia);
      mediaType = selectedMedia.type;
      const isVideo = selectedMedia.type.startsWith('video/');
      clearSelectedMedia();
      setUploadingMedia(false);

      if (!mediaUrl && !messageContent) {
        toast({
          title: 'Upload failed',
          description: 'Failed to upload media',
          variant: 'destructive',
        });
        setSendingMessage(false);
        return;
      }
    }

    const isVideo = mediaType?.startsWith('video/');
    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      content: messageContent || (mediaUrl ? (isVideo ? '🎬 Video' : '📷 Image') : ''),
      media_url: mediaUrl,
      media_type: mediaType,
    });

    if (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent);
    } else {
      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);
    }

    setSendingMessage(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-40px)] flex">
        {/* Conversations List */}
        <div
          className={cn(
            "w-full md:w-80 border-r border-border/50 flex flex-col",
            selectedConversation && "hidden md:flex"
          )}
        >
          <div className="p-4 border-b border-border/50">
            <h1 className="text-xl font-display font-bold neon-text-yellow">Messages</h1>
          </div>

          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-sm">Start chatting with creators!</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                      selectedConversation?.id === conv.id
                        ? "bg-secondary/50 neon-border-yellow"
                        : "hover:bg-secondary/30"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-pink to-neon-cyan flex items-center justify-center overflow-hidden flex-shrink-0">
                      {conv.other_user.avatar_url ? (
                        <img
                          src={conv.other_user.avatar_url}
                          alt={conv.other_user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-foreground truncate">
                          {conv.other_user.display_name || conv.other_user.username}
                        </p>
                        {conv.unread_count && conv.unread_count > 0 && (
                          <span className="w-5 h-5 bg-neon-pink text-background text-xs font-bold rounded-full flex items-center justify-center">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.last_message || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div
          className={cn(
            "flex-1 flex flex-col",
            !selectedConversation && "hidden md:flex"
          )}
        >
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border/50 flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 hover:bg-secondary/30 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-pink to-neon-cyan flex items-center justify-center overflow-hidden">
                  {selectedConversation.other_user.avatar_url ? (
                    <img
                      src={selectedConversation.other_user.avatar_url}
                      alt={selectedConversation.other_user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-background" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {selectedConversation.other_user.display_name || selectedConversation.other_user.username}
                  </p>
                  <p className="text-xs text-muted-foreground">@{selectedConversation.other_user.username}</p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isOwn = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2",
                            isOwn
                              ? "bg-gradient-to-r from-neon-pink/80 to-neon-purple/80 text-foreground"
                              : "bg-secondary/50 text-foreground"
                          )}
                        >
                          {message.media_url && message.media_type?.startsWith('video/') ? (
                            <video 
                              src={message.media_url}
                              controls
                              className="max-w-full rounded-lg max-h-64 mb-2"
                            />
                          ) : message.media_url && (
                            <a 
                              href={message.media_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block mb-2"
                            >
                              <img 
                                src={message.media_url} 
                                alt="Shared image" 
                                className="max-w-full rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              />
                            </a>
                          )}
                          {message.content && message.content !== '📷 Image' && message.content !== '🎬 Video' && (
                            <p className="break-words">{message.content}</p>
                          )}
                          <div className={cn(
                            "flex items-center gap-1 mt-1",
                            isOwn ? "justify-end" : "justify-start"
                          )}>
                            <p className={cn(
                              "text-xs",
                              isOwn ? "text-foreground/70" : "text-muted-foreground"
                            )}>
                              {format(new Date(message.created_at), 'HH:mm')}
                            </p>
                            {isOwn && (
                              message.is_read ? (
                                <CheckCheck className="w-3.5 h-3.5 text-neon-cyan" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-foreground/50" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Typing Indicator */}
                  {isOtherUserTyping && (
                    <div className="flex justify-start">
                      <div className="bg-secondary/50 rounded-2xl px-4 py-2 flex items-center gap-1">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-border/50 space-y-3">
                {/* Media Preview */}
                {mediaPreview && selectedMedia && (
                  <div className="relative inline-block">
                    {selectedMedia.type.startsWith('video/') ? (
                      <video 
                        src={mediaPreview}
                        className="h-20 rounded-lg object-cover"
                      />
                    ) : (
                      <img 
                        src={mediaPreview} 
                        alt="Preview" 
                        className="h-20 rounded-lg object-cover"
                      />
                    )}
                    <button
                      onClick={clearSelectedMedia}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {selectedMedia.type.startsWith('video/') && (
                      <div className="absolute bottom-1 left-1 p-1 bg-background/80 rounded">
                        <Video className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleMediaSelect}
                    accept="image/*,video/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sendingMessage || uploadingMedia}
                    className="border-border/50 hover:bg-secondary/50"
                    title="Send image or video"
                  >
                    <Image className="w-5 h-5" />
                  </Button>
                  <Input
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 bg-secondary/30 border-border/50"
                    disabled={sendingMessage}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={(!newMessage.trim() && !selectedMedia) || sendingMessage}
                    className="bg-gradient-to-r from-neon-pink to-neon-purple hover:opacity-90"
                  >
                    {uploadingMedia ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">Select a conversation</p>
              <p className="text-sm">Choose from your existing conversations</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
