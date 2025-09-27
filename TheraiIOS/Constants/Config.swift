//
//  Config.swift
//  TheraiIOS
//
//  Created by Peter Farrah on 27/9/2025.
//

import Foundation

struct Config {
    static let supabaseUrl = "https://api.therai.co"
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZXJhaSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM1MzI0MDAwLCJleHAiOjIwNTA4OTk2MDB9.placeholder"
    
    // OAuth Configuration
    static let googleClientId = "706959873059-ilu0j4usjtfuehp4h3l06snknbcnd2f4.apps.googleusercontent.com"
    static let appleClientId = "co.scai.TheraiIOS"
    
    // API Endpoints
    static let baseApiUrl = "https://api.therai.co"
    static let chatEndpoint = "/api/chat"
    static let threadsEndpoint = "/api/threads"
}