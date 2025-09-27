//
//  AuthService.swift
//  TheraiIOS
//
//  Created by Peter Farrah on 27/9/2025.
//

import Foundation
import AuthenticationServices

@MainActor
class AuthService: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let supabaseService = SupabaseService.shared
    
    init() {
        checkAuthState()
    }
    
    private func checkAuthState() {
        if let user = supabaseService.getCurrentUser() {
            self.currentUser = user
            self.isAuthenticated = true
        }
    }
    
    // MARK: - Email Authentication
    
    func signInWithEmail(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let authUser = try await supabaseService.signInWithEmail(email: email, password: password)
            self.currentUser = authUser.user
            self.isAuthenticated = true
        } catch {
            self.errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func signUpWithEmail(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let authUser = try await supabaseService.signUpWithEmail(email: email, password: password)
            self.currentUser = authUser.user
            self.isAuthenticated = true
        } catch {
            self.errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    // MARK: - Google Sign-In
    
    func signInWithGoogle() async throws {
        isLoading = true
        errorMessage = nil
        
        // TODO: Implement Google Sign-In when SDK is added
        throw AuthError.invalidCredential
    }
    
    // MARK: - Apple Sign-In
    
    func signInWithApple() async throws {
        isLoading = true
        errorMessage = nil
        
        // TODO: Implement Apple Sign-In when SDK is added
        throw AuthError.invalidCredential
    }
    
    // MARK: - Sign Up
    
    func signUp(email: String, password: String) async throws {
        isLoading = true
        errorMessage = nil
        
        do {
            let authUser = try await supabaseService.signUpWithEmail(email: email, password: password)
            self.currentUser = authUser.user
            self.isAuthenticated = true
        } catch {
            self.errorMessage = error.localizedDescription
            throw error
        }
        
        isLoading = false
    }
    
    // MARK: - Sign Out
    
    func signOut() async throws {
        isLoading = true
        errorMessage = nil
        
        do {
            try await supabaseService.signOut()
            self.currentUser = nil
            self.isAuthenticated = false
        } catch {
            self.errorMessage = error.localizedDescription
            throw error
        }
        
        isLoading = false
    }
}

// MARK: - Auth Errors

enum AuthError: LocalizedError {
    case noPresentingViewController
    case noIdToken
    case invalidCredential
    
    var errorDescription: String? {
        switch self {
        case .noPresentingViewController:
            return "No presenting view controller found"
        case .noIdToken:
            return "No ID token received"
        case .invalidCredential:
            return "Invalid credential"
        }
    }
}