package com.careerfit.backend.common.util;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * TF-IDF vectorization using a STATIC corpus.
 *
 * Strategy:
 *  - IDF is computed once at startup from a seeded IT skill corpus.
 *  - This ensures consistent scores across all CV-JD pairs.
 *  - New documents don't shift the IDF landscape (deterministic scoring).
 *
 * Formula:
 *  TF(t, d)  = count(t in d) / total_terms(d)
 *  IDF(t)    = log(1 + N / (1 + df(t)))   [smoothed]
 *  TFIDF(t, d) = TF(t,d) * IDF(t)
 */
@Service
public class TfIdfService {

    private static final Logger log = LoggerFactory.getLogger(TfIdfService.class);

    /** Static IDF lookup built from the seed corpus at startup. */
    private Map<String, Double> idfMap;

    /** Number of seed documents. */
    private int corpusSize;

    // ── Seed Corpus: representative IT job/CV terms ────────────────────────
    // Each entry represents a "document" in the corpus.
    // Grouped by: Programming Languages, Frameworks, Databases, Cloud, DevOps,
    // Soft skills, Seniority, Vietnamese IT terms.
    private static final List<List<String>> SEED_CORPUS = List.of(
        // Backend langs
        List.of("java","spring","springboot","hibernate","maven","gradle","microservice"),
        List.of("python","django","flask","fastapi","celery","sqlalchemy","pandas","numpy"),
        List.of("nodejs","express","typescript","javascript","nestjs","deno","bun"),
        List.of("golang","go","gin","fiber","grpc","protobuf"),
        List.of("kotlin","java","android","spring","coroutine","jetpack"),
        List.of("csharp","dotnet","aspnet","ef","blazor","azure"),
        List.of("php","laravel","symfony","wordpress","composer"),
        List.of("ruby","rails","sinatra","rspec"),
        List.of("scala","akka","spark","functional","fp"),
        List.of("rust","systems","embedded","wasm"),
        // Frontend
        List.of("react","redux","nextjs","hooks","typescript","tailwind","webpack","vite"),
        List.of("vue","nuxt","pinia","vuex","composition","api"),
        List.of("angular","rxjs","ngrx","material","zone"),
        List.of("html","css","javascript","responsive","accessibility","sass","figma"),
        List.of("flutter","dart","mobile","crossplatform","bloc","riverpod"),
        List.of("reactnative","expo","native","mobile","ios","android"),
        // Databases
        List.of("postgresql","mysql","mariadb","sql","query","index","transaction","acid"),
        List.of("mongodb","nosql","document","aggregation","atlas","replication"),
        List.of("redis","cache","pubsub","session","queue"),
        List.of("elasticsearch","kibana","logstash","search","fulltext"),
        List.of("cassandra","dynamodb","bigtable","timeseries","columnstore"),
        List.of("oracle","mssql","plsql","storedprocedure","trigger"),
        // Cloud / DevOps
        List.of("aws","ec2","s3","lambda","rds","eks","ecs","cloudformation","iam"),
        List.of("gcp","gke","bigquery","pubsub","cloudstorage","firebase"),
        List.of("azure","aks","devops","pipelines","cosmos","functions"),
        List.of("docker","kubernetes","helm","container","microservice","orchestration"),
        List.of("cicd","jenkins","github","gitlab","actions","pipeline","argocd","gitops"),
        List.of("terraform","ansible","pulumi","iac","infrastructure"),
        List.of("linux","bash","shell","ubuntu","centos","networking","ssh"),
        // Architecture / Patterns
        List.of("microservice","monolith","api","rest","graphql","grpc","websocket"),
        List.of("kafka","rabbitmq","message","queue","event","streaming","pubsub"),
        List.of("ddd","cleanarchitecture","hexagonal","solid","designpattern"),
        List.of("tdd","bdd","unittest","integration","mockito","jest","pytest"),
        // Security
        List.of("security","oauth","jwt","authentication","authorization","https","tls"),
        List.of("pentesting","vulnerability","encryption","compliance","gdpr"),
        // AI / ML / Data
        List.of("machinelearning","deeplearning","tensorflow","pytorch","scikit","nlp"),
        List.of("datascience","analytics","visualization","tableau","powerbi","sql"),
        List.of("mlops","airflow","mlflow","kubeflow","feature","engineering"),
        // Agile / Soft skills
        List.of("agile","scrum","kanban","jira","confluence","sprint","retrospective"),
        List.of("leadership","teamwork","communication","problemsolving","mentoring"),
        List.of("english","bilingual","vietnamese","teamplayer","selfmotivated"),
        // Seniority / Roles
        List.of("senior","lead","architect","staff","principal","vp","director"),
        List.of("junior","fresher","intern","trainee","graduate","entry"),
        List.of("fullstack","backend","frontend","mobile","devops","sre","qa","pm"),
        // Vietnamese IT common terms
        List.of("lập","trình","phát","triển","phần","mềm","kỹ","năng","kinh","nghiệm"),
        List.of("thiết","kế","hệ","thống","cơ","sở","dữ","liệu","máy","chủ"),
        List.of("quản","lý","dự","án","nhóm","làm","việc","môi","trường"),
        List.of("công","nghệ","thông","tin","ứng","dụng","web","mobile","api"),
        List.of("tốt","nghiệp","đại","học","cao","học","bằng","chứng","chỉ")
    );

    @PostConstruct
    public void buildIdf() {
        log.info("Building TF-IDF IDF map from {} seed documents...", SEED_CORPUS.size());
        corpusSize = SEED_CORPUS.size();

        // Count document frequency for each term
        Map<String, Integer> df = new HashMap<>();
        for (List<String> doc : SEED_CORPUS) {
            Set<String> termSet = new HashSet<>(doc);
            for (String term : termSet) {
                df.merge(term.toLowerCase(), 1, Integer::sum);
            }
        }

        // Compute smoothed IDF: log(1 + N / (1 + df))
        idfMap = new HashMap<>();
        for (var entry : df.entrySet()) {
            double idf = Math.log(1.0 + (double) corpusSize / (1.0 + entry.getValue()));
            idfMap.put(entry.getKey(), idf);
        }

        // Unknown terms get a high IDF (treat as rare and informative)
        log.info("IDF map built. Vocabulary size: {}", idfMap.size());
    }

    /**
     * Compute TF-IDF vector for a list of tokens.
     * Returns a map of term → tfidf_weight.
     */
    public Map<String, Double> buildVector(List<String> tokens) {
        if (tokens == null || tokens.isEmpty()) return Collections.emptyMap();

        int total = tokens.size();

        // TF: term frequency
        Map<String, Integer> tf = new HashMap<>();
        for (String token : tokens) {
            tf.merge(token.toLowerCase(), 1, Integer::sum);
        }

        // TF-IDF
        Map<String, Double> vector = new HashMap<>();
        double unknownIdf = Math.log(1.0 + corpusSize); // high IDF for unseen terms

        for (var entry : tf.entrySet()) {
            String term = entry.getKey();
            double termFreq = (double) entry.getValue() / total;
            double idf = idfMap.getOrDefault(term, unknownIdf);
            vector.put(term, termFreq * idf);
        }

        return vector;
    }

    /**
     * Cosine similarity between two TF-IDF vectors.
     * Returns value in [0.0, 1.0].
     */
    public double cosineSimilarity(Map<String, Double> vecA, Map<String, Double> vecB) {
        if (vecA.isEmpty() || vecB.isEmpty()) return 0.0;

        // Dot product (only iterate over smaller vector for efficiency)
        Map<String, Double> smaller = vecA.size() <= vecB.size() ? vecA : vecB;
        Map<String, Double> larger  = vecA.size() <= vecB.size() ? vecB : vecA;

        double dotProduct = 0.0;
        for (var entry : smaller.entrySet()) {
            Double val = larger.get(entry.getKey());
            if (val != null) {
                dotProduct += entry.getValue() * val;
            }
        }

        // Magnitudes
        double magA = magnitude(vecA);
        double magB = magnitude(vecB);

        if (magA == 0.0 || magB == 0.0) return 0.0;
        return dotProduct / (magA * magB);
    }

    private double magnitude(Map<String, Double> vec) {
        double sum = 0.0;
        for (double v : vec.values()) {
            sum += v * v;
        }
        return Math.sqrt(sum);
    }

    /**
     * Returns copy of the IDF map (for inspection/testing).
     */
    public Map<String, Double> getIdfMap() {
        return Collections.unmodifiableMap(idfMap);
    }
}
