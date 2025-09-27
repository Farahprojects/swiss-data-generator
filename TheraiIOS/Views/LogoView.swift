//
//  LogoView.swift
//  TheraiIOS
//
//  Created by Peter Farrah on 27/9/2025.
//

import SwiftUI

enum LogoSize {
    case small
    case medium
    case large
    
    var textSize: CGFloat {
        switch self {
        case .small: return 20 // text-xl = 20px
        case .medium: return 24 // text-2xl = 24px
        case .large: return 32 // text-3xl = 32px
        }
    }
    
    var iconSize: CGFloat {
        switch self {
        case .small: return 20 // h-5 w-5 = 20px
        case .medium: return 24 // h-6 w-6 = 24px
        case .large: return 32 // h-8 w-8 = 32px
        }
    }
}

struct LogoView: View {
    let size: LogoSize
    
    var body: some View {
        HStack(spacing: 8) { // gap-2 = 8px
            // Use system icon as placeholder until logo is added to Xcode
            Image(systemName: "sparkles")
                .foregroundColor(.black)
                .frame(width: size.iconSize, height: size.iconSize)
            
            Text("Therai.")
                .font(.system(size: size.textSize, weight: .medium)) // font-medium
                .foregroundColor(.black) // text-foreground
                .tracking(-0.5) // tracking-tight
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        LogoView(size: .small)
        LogoView(size: .medium)
        LogoView(size: .large)
    }
    .padding()
}