//
//  ContentView.swift
//  TheraiIOS
//
//  Created by Peter Farrah on 27/9/2025.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var authService = AuthService()
    
    var body: some View {
        Group {
            if authService.isAuthenticated {
                ChatView()
                    .environmentObject(authService)
            } else {
                LoginView()
                    .environmentObject(authService)
            }
        }
    }
}

#Preview {
    ContentView()
}