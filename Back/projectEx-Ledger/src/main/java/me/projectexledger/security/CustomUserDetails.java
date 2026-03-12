package me.projectexledger.security;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.util.Collection;

@Getter
public class CustomUserDetails extends User {
    private final boolean isApproved;
    private final boolean mfaVerified;

    public CustomUserDetails(String username, String password, Collection<? extends GrantedAuthority> authorities, boolean isApproved, boolean mfaVerified) {
        super(username, password, authorities);
        this.isApproved = isApproved;
        this.mfaVerified = mfaVerified;
    }
}
