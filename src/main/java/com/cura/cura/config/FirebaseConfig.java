package com.cura.cura.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.io.FileInputStream;
import java.io.InputStream;

/**
 * Firebase Admin SDK Configuration.
 * If firebase.config.path is set and points to a valid service account JSON,
 * FirebaseApp will be initialized. Otherwise, runs in local fallback mode.
 */
@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${firebase.config.path:}")
    private String firebaseConfigPath;

    @Value("${firebase.project.id:cura-clinic-pwa}")
    private String firebaseProjectId;

    @PostConstruct
    public void initFirebase() {
        if (FirebaseApp.getApps().isEmpty()) {
            try {
                if (firebaseConfigPath != null && !firebaseConfigPath.trim().isEmpty()) {
                    InputStream serviceAccount = new FileInputStream(firebaseConfigPath);
                    FirebaseOptions options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                            .setProjectId(firebaseProjectId)
                            .build();

                    FirebaseApp.initializeApp(options);
                    log.info("Firebase Admin SDK initialized successfully with service account.");
                } else {
                    log.info("Firebase service account not configured. Operating in local in-memory/REST fallback mode.");
                }
            } catch (Exception e) {
                log.warn("Firebase Admin SDK initialization skipped/failed: {}. Running in local fallback mode.", e.getMessage());
            }
        }
    }
}
