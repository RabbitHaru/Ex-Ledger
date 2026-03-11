package me.projectexledger.security;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.util.Collection;

@Getter
public class CustomUserDetails extends User {
    private final boolean isApproved;

    public CustomUserDetails(String username, String password, Collection<? extends GrantedAuthority> authorities, boolean isApproved) {
        super(username, password, authorities);
        this.isApproved = isApproved;
    }
}
