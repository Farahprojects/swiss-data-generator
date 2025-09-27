//
//  Message.swift
//  TheraiIOS
//
//  Created by Peter Farrah on 27/9/2025.
//

import Foundation

struct Message: Codable, Identifiable {
    let id: String
    let threadId: String
    let role: MessageRole
    let content: String
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case threadId = "thread_id"
        case role
        case content
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum MessageRole: String, Codable, CaseIterable {
    case user = "user"
    case assistant = "assistant"
    case system = "system"
}

struct Thread: Codable, Identifiable, Hashable, Equatable {
    let id: String
    let userId: String
    let title: String?
    let createdAt: Date
    let updatedAt: Date
    let messages: [Message]?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case title
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case messages
    }
    
    // Hashable conformance
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    
    // Equatable conformance
    static func == (lhs: Thread, rhs: Thread) -> Bool {
        return lhs.id == rhs.id
    }
}