//
//  User.swift
//  TheraiIOS
//
//  Created by Peter Farrah on 27/9/2025.
//

import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String?
    let avatarUrl: String?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case name
        case avatarUrl = "avatar_url"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct AuthUser: Codable {
    let user: User
    let session: AppSession
}

struct AppSession: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: Date
    
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresAt = "expires_at"
    }
}