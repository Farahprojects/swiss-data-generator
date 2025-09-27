//
//  ChatView.swift
//  TheraiIOS
//
//  Created by Peter Farrah on 27/9/2025.
//

import SwiftUI

struct ChatView: View {
    @StateObject private var authService = AuthService()
    @StateObject private var supabaseService = SupabaseService.shared
    @State private var threads: [Thread] = []
    @State private var selectedThread: Thread?
    @State private var messages: [Message] = []
    @State private var newMessage = ""
    @State private var isLoading = false
    @State private var showingNewThread = false
    
    var body: some View {
        NavigationView {
            HStack(spacing: 0) {
                // Sidebar with threads
                VStack(alignment: .leading, spacing: 0) {
                    // Header
                    HStack {
                        Text("Chats")
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Spacer()
                        
                        Button(action: {
                            showingNewThread = true
                        }) {
                            Image(systemName: "plus")
                                .font(.title3)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    
                    // Threads list
                    List(threads, id: \.id, selection: $selectedThread) { thread in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(thread.title ?? "New Chat")
                                .font(.headline)
                                .lineLimit(1)
                            
                            if let lastMessage = thread.messages?.last {
                                Text(lastMessage.content)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                    .lineLimit(2)
                            }
                            
                            Text(thread.updatedAt, style: .relative)
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                    .listStyle(PlainListStyle())
                }
                .frame(width: 280)
                .background(Color(.systemBackground))
                
                Divider()
                
                // Main chat area
                VStack(spacing: 0) {
                    if let thread = selectedThread {
                        // Chat header
                        HStack {
                            Text(thread.title ?? "New Chat")
                                .font(.headline)
                            
                            Spacer()
                            
                            Button(action: {
                                Task {
                                    await authService.signOut()
                                }
                            }) {
                                Image(systemName: "person.circle")
                                    .font(.title2)
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        
                        // Messages
                        ScrollViewReader { proxy in
                            ScrollView {
                                LazyVStack(spacing: 12) {
                                    ForEach(messages) { message in
                                        MessageBubble(message: message)
                                            .id(message.id)
                                    }
                                }
                                .padding()
                            }
                            .onChange(of: messages.count) { _ in
                                if let lastMessage = messages.last {
                                    withAnimation {
                                        proxy.scrollTo(lastMessage.id, anchor: .bottom)
                                    }
                                }
                            }
                        }
                        
                        // Message input
                        HStack(spacing: 12) {
                            TextField("Type a message...", text: $newMessage, axis: .vertical)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .lineLimit(1...4)
                            
                            Button(action: sendMessage) {
                                Image(systemName: "paperplane.fill")
                                    .foregroundColor(.white)
                                    .frame(width: 36, height: 36)
                                    .background(newMessage.isEmpty ? Color.gray : Color.blue)
                                    .clipShape(Circle())
                            }
                            .disabled(newMessage.isEmpty || isLoading)
                        }
                        .padding()
                        .background(Color(.systemBackground))
                    } else {
                        // Empty state
                        VStack(spacing: 16) {
                            Image(systemName: "bubble.left.and.bubble.right")
                                .font(.system(size: 60))
                                .foregroundColor(.secondary)
                            
                            Text("Select a chat to start")
                                .font(.title2)
                                .foregroundColor(.secondary)
                            
                            Button("Start New Chat") {
                                showingNewThread = true
                            }
                            .buttonStyle(.borderedProminent)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                }
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            loadThreads()
        }
        .onChange(of: selectedThread) { thread in
            if let thread = thread {
                loadMessages(for: thread.id)
            }
        }
        .sheet(isPresented: $showingNewThread) {
            NewThreadView { title in
                Task {
                    await createNewThread(title: title)
                }
            }
        }
    }
    
    private func loadThreads() {
        Task {
            do {
                let fetchedThreads = try await supabaseService.fetchThreads()
                await MainActor.run {
                    self.threads = fetchedThreads
                    if selectedThread == nil && !fetchedThreads.isEmpty {
                        selectedThread = fetchedThreads.first
                    }
                }
            } catch {
                print("Error loading threads: \(error)")
            }
        }
    }
    
    private func loadMessages(for threadId: String) {
        Task {
            do {
                let fetchedMessages = try await supabaseService.fetchMessages(for: threadId)
                await MainActor.run {
                    self.messages = fetchedMessages
                }
            } catch {
                print("Error loading messages: \(error)")
            }
        }
    }
    
    private func createNewThread(title: String?) async {
        do {
            let newThread = try await supabaseService.createThread(title: title)
            await MainActor.run {
                threads.append(newThread)
                selectedThread = newThread
                messages = []
            }
        } catch {
            print("Error creating thread: \(error)")
        }
    }
    
    private func sendMessage() {
        guard let thread = selectedThread, !newMessage.isEmpty else { return }
        
        let messageContent = newMessage
        newMessage = ""
        isLoading = true
        
        Task {
            do {
                // Add user message
                let userMessage = try await supabaseService.sendMessage(
                    threadId: thread.id,
                    content: messageContent,
                    role: .user
                )
                
                await MainActor.run {
                    messages.append(userMessage)
                }
                
                // TODO: Send to AI and get response
                // For now, just add a placeholder response
                let responseMessage = try await supabaseService.sendMessage(
                    threadId: thread.id,
                    content: "This is a placeholder response. AI integration coming soon!",
                    role: .assistant
                )
                
                await MainActor.run {
                    messages.append(responseMessage)
                    isLoading = false
                }
                
            } catch {
                await MainActor.run {
                    isLoading = false
                    print("Error sending message: \(error)")
                }
            }
        }
    }
}

struct MessageBubble: View {
    let message: Message
    
    var body: some View {
        HStack {
            if message.role == .user {
                Spacer()
            }
            
            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .padding()
                    .background(message.role == .user ? Color.blue : Color(.systemGray5))
                    .foregroundColor(message.role == .user ? .white : .primary)
                    .cornerRadius(16)
                
                Text(message.createdAt, style: .time)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity * 0.7, alignment: message.role == .user ? .trailing : .leading)
            
            if message.role != .user {
                Spacer()
            }
        }
    }
}

struct NewThreadView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    let onSave: (String?) -> Void
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                TextField("Chat title (optional)", text: $title)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                
                Spacer()
            }
            .padding()
            .navigationTitle("New Chat")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Create") {
                        onSave(title.isEmpty ? nil : title)
                        dismiss()
                    }
                    .disabled(title.isEmpty)
                }
            }
        }
    }
}

#Preview {
    ChatView()
}