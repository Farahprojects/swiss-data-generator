//
//  SupabaseService.swift
//  TheraiIOS
//
//  Created by Peter Farrah on 27/9/2025.
//

import Foundation
import Supabase

final class SupabaseService: ObservableObject {
    static let shared = SupabaseService()
    
    private let client: SupabaseClient
    
    private init() {
        guard let url = URL(string: Config.supabaseUrl) else {
            fatalError("Supabase URL missing in Config.supabaseUrl")
        }
        client = SupabaseClient(supabaseURL: url, supabaseKey: Config.supabaseAnonKey)
    }
    
    // MARK: - Authentication
    
    func signInWithEmail(email: String, password: String) async throws -> AuthUser {
        let response = try await client.auth.signIn(email: email, password: password)
        guard let user = response.user, let s = response.session else { throw AuthError.invalidCredential }
        return AuthUser(
            user: User(
                id: user.id.uuidString,
                email: user.email ?? "",
                name: user.userMetadata?["full_name"] as? String,
                avatarUrl: user.userMetadata?["avatar_url"] as? String,
                createdAt: user.createdAt ?? Date(),
                updatedAt: user.updatedAt ?? Date()
            ),
            session: AppSession(
                accessToken: s.accessToken,
                refreshToken: s.refreshToken,
                expiresAt: s.expiresAt ?? Date()
            )
        )
    }
    
    func signUpWithEmail(email: String, password: String) async throws -> AuthUser {
        let response = try await client.auth.signUp(email: email, password: password)
        guard let user = response.user, let s = response.session else { throw AuthError.invalidCredential }
        return AuthUser(
            user: User(
                id: user.id.uuidString,
                email: user.email ?? "",
                name: user.userMetadata?["full_name"] as? String,
                avatarUrl: user.userMetadata?["avatar_url"] as? String,
                createdAt: user.createdAt ?? Date(),
                updatedAt: user.updatedAt ?? Date()
            ),
            session: AppSession(
                accessToken: s.accessToken,
                refreshToken: s.refreshToken,
                expiresAt: s.expiresAt ?? Date()
            )
        )
    }
    
    func signOut() async throws {
        try await client.auth.signOut()
    }
    
    func getCurrentUser() -> User? {
        guard let user = client.auth.currentUser else { return nil }
        return User(
            id: user.id.uuidString,
            email: user.email ?? "",
            name: user.userMetadata?["full_name"] as? String,
            avatarUrl: user.userMetadata?["avatar_url"] as? String,
            createdAt: user.createdAt ?? Date(),
            updatedAt: user.updatedAt ?? Date()
        )
    }
    
    func getCurrentSession() -> AppSession? {
        guard let s = client.auth.session else { return nil }
        return AppSession(accessToken: s.accessToken, refreshToken: s.refreshToken, expiresAt: s.expiresAt ?? Date())
    }
    
    // MARK: - Threads (stubs)
    
    func fetchThreads() async throws -> [Thread] {
        return []
    }
    
    func createThread(title: String?) async throws -> Thread {
        throw NSError(domain: "SupabaseService", code: 1, userInfo: [NSLocalizedDescriptionKey: "Not implemented"])
    }
    
    // MARK: - Messages (stubs)
    
    func fetchMessages(for threadId: String) async throws -> [Message] {
        return []
    }
    
    func sendMessage(threadId: String, content: String, role: MessageRole) async throws -> Message {
        throw NSError(domain: "SupabaseService", code: 1, userInfo: [NSLocalizedDescriptionKey: "Not implemented"])
    }
}