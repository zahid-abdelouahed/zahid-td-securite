package com.example.banque.utilisateur.out;

import com.example.banque.utilisateur.Utilisateur;
import com.example.banque.utilisateur.UtilisateurRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UtilisateurDetailsService implements UserDetailsService {

    private final UtilisateurRepository utilisateurs;

    public UtilisateurDetailsService(UtilisateurRepository utilisateurs) {
        this.utilisateurs = utilisateurs;
    }

    @Override
    public UserDetails loadUserByUsername(String login) throws UsernameNotFoundException {
        Utilisateur utilisateur = utilisateurs.findByLogin(login)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur inconnu : " + login));
        return User.withUsername(utilisateur.getLogin())
                .password(utilisateur.getMotDePasse())     
                .roles(utilisateur.getRole().name())     
                .build();
    }
}