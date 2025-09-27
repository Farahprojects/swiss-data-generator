//
//  LoginView.swift
//  TheraiIOS
//
//  Created by Peter Farrah on 27/9/2025.
//

import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authService: AuthService
    @State private var showingSignUp = false
    @State private var errorMessage: String?
    
    var body: some View {
        VStack(spacing: 0) {
            // Hero Section (White) - matches web exactly
            VStack(alignment: .leading, spacing: 0) {
                // Logo at top
                HStack {
                    LogoView(size: .small)
                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.top, 48) // pt-12 = 48px
                .padding(.bottom, 40) // pb-10 = 40px
                
                // Hero Text - matches web exactly
                VStack(alignment: .leading, spacing: 12) { // space-y-3 = 12px
                    Text("Know yourself")
                        .font(.system(size: 36, weight: .light)) // text-4xl font-light
                        .foregroundColor(.black) // text-gray-900
                        .lineLimit(nil)
                    + Text(" better.")
                        .font(.system(size: 36, weight: .light))
                        .italic()
                        .foregroundColor(.black)
                    
                    HStack(spacing: 8) { // gap-2 = 8px
                        // Removed spinner as requested
                        Text("Your personal AI‑driven astrology companion")
                            .font(.system(size: 16, weight: .light)) // font-light
                            .foregroundColor(.gray) // text-gray-600
                    }
                }
                .padding(.horizontal, 20)
                
                Spacer()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.white)
            
            // Auth Section (Black) - matches web exactly
            VStack(spacing: 12) { // space-y-3 = 12px
                // Google Button - matches web exactly
                Button(action: {
                    Task {
                        await signInWithGoogle()
                    }
                }) {
                    HStack(spacing: 8) { // mr-2 = 8px
                        Image(systemName: "globe")
                            .foregroundColor(.blue)
                            .frame(width: 20, height: 20) // h-5 w-5 = 20px
                        Text("Continue with Google")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.black)
                    }
                    .frame(maxWidth: .infinity) // w-full
                    .frame(height: 48) // h-12 = 48px
                    .background(Color.white) // bg-white
                    .cornerRadius(24) // rounded-full
                }
                .disabled(authService.isLoading)
                
                // Apple Button - matches web exactly
                Button(action: {
                    Task {
                        await signInWithApple()
                    }
                }) {
                    HStack(spacing: 8) { // mr-2 = 8px
                        Image(systemName: "applelogo")
                            .foregroundColor(.black)
                            .frame(width: 20, height: 20) // h-5 w-5 = 20px
                        Text("Continue with Apple")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.black)
                    }
                    .frame(maxWidth: .infinity) // w-full
                    .frame(height: 48) // h-12 = 48px
                    .background(Color.white) // bg-white
                    .cornerRadius(24) // rounded-full
                }
                .disabled(authService.isLoading)
                
                // Login Button - matches web exactly
                Button(action: {
                    showingSignUp = true
                }) {
                    Text("Log in")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white) // text-white
                        .frame(maxWidth: .infinity) // w-full
                        .frame(height: 48) // h-12 = 48px
                        .background(Color.clear) // bg-white/0
                        .overlay(
                            RoundedRectangle(cornerRadius: 24) // rounded-full
                                .stroke(Color.white, lineWidth: 1) // border border-white
                        )
                }
                .disabled(authService.isLoading)
            }
            .padding(.horizontal, 20) // px-5 = 20px
            .padding(.top, 32) // pt-8 = 32px
            .padding(.bottom, 40) // pb-10 = 40px
            .background(Color.black) // bg-black
            .cornerRadius(24, corners: [.topLeft, .topRight]) // rounded-t-3xl
        }
        .ignoresSafeArea(.all, edges: .bottom)
        .sheet(isPresented: $showingSignUp) {
            SignUpView(isPresented: $showingSignUp)
        }
        .alert("Error", isPresented: .constant(errorMessage != nil)) {
            Button("OK") { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "An unknown error occurred.")
        }
    }
    
    private func signInWithGoogle() async {
        errorMessage = nil
        do {
            try await authService.signInWithGoogle()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    private func signInWithApple() async {
        errorMessage = nil
        do {
            try await authService.signInWithApple()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct SignUpView: View {
    @EnvironmentObject var authService: AuthService
    @Binding var isPresented: Bool
    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Sign Up")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .padding(.bottom, 20)
                
                VStack(spacing: 20) {
                    TextField("Email", text: $email)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)
                    
                    SecureField("Password", text: $password)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    if let errorMessage = errorMessage {
                        Text(errorMessage)
                            .foregroundColor(.red)
                    }
                    
                    Button(action: {
                        Task {
                            await signUp()
                        }
                    }) {
                        Text("Sign Up")
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color.green)
                            .cornerRadius(10)
                    }
                    .disabled(authService.isLoading)
                    
                    Button(action: {
                        isPresented = false
                    }) {
                        Text("Already have an account? Log In")
                            .font(.subheadline)
                            .foregroundColor(.green)
                    }
                    .disabled(authService.isLoading)
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        isPresented = false
                    }
                }
            }
        }
    }
    
    private func signUp() async {
        errorMessage = nil
        do {
            try await authService.signUp(email: email, password: password)
            isPresented = false // Dismiss on successful sign up
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// Extension for corner radius on specific corners
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthService())
}