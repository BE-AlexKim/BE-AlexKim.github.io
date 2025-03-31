---
layout: post
title: JPA N+1 문제와 QueryDSL을 이용한 해결 방법 (Kotlin)
categories: [Backend, JPA, QueryDSL, Kotlin]
tags: [Kotlin, Spring, JPA, Hibernate, QueryDSL, 성능최적화]
banner:
  image: /assets/images/banners/jpa-querydsl.jpg
  opacity: 0.8
  background: "#000"
  height: "100vh"
  min_height: "38vh"
  heading_style: "font-size: 3em; font-weight: bold"
  subheading_style: "color: gold"
---

## JPA N+1 문제란?

JPA를 사용하다 보면 자주 마주치게 되는 성능 이슈 중 하나가 N+1 문제입니다. 이 문제는 데이터베이스 쿼리 수행 횟수가 불필요하게 많아져 애플리케이션 성능을 저하시키는 원인이 됩니다.

### N+1 문제 발생 상황

예를 들어, 아래와 같은 엔티티 관계가 있다고 가정해 봅시다:

```kotlin
@Entity
class Team(
    @Id @GeneratedValue
    val id: Long? = null,
    
    val name: String,
    
    @OneToMany(mappedBy = "team", fetch = FetchType.LAZY)
    val members: MutableList<Member> = mutableListOf()
)

@Entity
class Member(
    @Id @GeneratedValue
    val id: Long? = null,
    
    val name: String,
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    val team: Team
)
```

이제 모든 팀과 각 팀에 속한 멤버들을 조회하는 상황을 생각해봅시다:

```kotlin
val teams = teamRepository.findAll()  // 여기서 1번의 쿼리 발생 (SELECT * FROM team)

for (team in teams) {
    val members = team.members  // 각 팀마다 멤버 조회 쿼리 발생
    // 멤버 데이터 처리
}
```

위 코드에서 `findAll()`로 모든 팀을 조회할 때 1번의 쿼리가 발생하고, 각 팀의 멤버를 조회할 때마다 추가 쿼리가 발생합니다. 만약 팀이 N개라면 총 N+1번의 쿼리가 실행되는 것입니다:
- 팀 조회를 위한 1번의 쿼리
- 각 팀의 멤버 조회를 위한 N번의 쿼리

이것이 바로 N+1 문제입니다.

## JPA에서 N+1 문제 해결 방법

JPA는 이러한 N+1 문제를 해결하기 위한 몇 가지 방법을 제공합니다:

### 1. Fetch Join 사용

JPQL의 fetch join을 사용하면 연관된 엔티티를 한 번의 쿼리로 함께 조회할 수 있습니다:

```kotlin
interface TeamRepository : JpaRepository<Team, Long> {
    @Query("SELECT t FROM Team t JOIN FETCH t.members")
    fun findAllWithMembers(): List<Team>
}
```

이 방식은 한 번의 쿼리로 팀과 멤버를 모두 가져오므로 N+1 문제를 해결할 수 있습니다.

### 2. EntityGraph 사용

JPA의 `@EntityGraph`를 사용하여 같은 효과를 얻을 수 있습니다:

```kotlin
interface TeamRepository : JpaRepository<Team, Long> {
    @EntityGraph(attributePaths = ["members"])
    @Query("SELECT t FROM Team t")
    fun findAllWithMembers(): List<Team>
}
```

### 3. Batch Size 설정

`@BatchSize` 어노테이션이나 hibernate.default_batch_fetch_size 설정을 사용하여 N+1 문제를 완화할 수 있습니다:

```kotlin
@Entity
class Team(
    @Id @GeneratedValue
    val id: Long? = null,
    
    val name: String,
    
    @BatchSize(size = 100)
    @OneToMany(mappedBy = "team", fetch = FetchType.LAZY)
    val members: MutableList<Member> = mutableListOf()
)
```

또는 `application.yml`에서 글로벌하게 설정:

```yaml
spring:
  jpa:
    properties:
      hibernate:
        default_batch_fetch_size: 100
```

이 설정은 N+1 문제를 N/batch_size + 1로 줄여줍니다.

## QueryDSL을 활용한 N+1 문제 해결

위의 방법들은 효과적이지만, 복잡한 쿼리나 동적 쿼리에서는 제약이 있을 수 있습니다. 이때 QueryDSL이 강력한 대안이 됩니다.

### QueryDSL 소개

QueryDSL은 타입 안전한 쿼리를 작성할 수 있게 해주는 프레임워크입니다. 컴파일 시점에 오류를 발견할 수 있고, 복잡한 쿼리를 코틀린 코드로 작성할 수 있어 가독성과 유지보수성이 향상됩니다.

### 1. QueryDSL 설정 (Kotlin)

먼저 프로젝트에 QueryDSL을 추가해야 합니다. 코틀린 프로젝트에서는 다음과 같이 설정할 수 있습니다:

```kotlin
// build.gradle.kts
plugins {
    kotlin("jvm") version "1.7.10"
    kotlin("plugin.spring") version "1.7.10"
    kotlin("plugin.jpa") version "1.7.10"
    kotlin("kapt") version "1.7.10"
    id("org.springframework.boot") version "2.7.5"
    id("io.spring.dependency-management") version "1.0.15.RELEASE"
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("com.querydsl:querydsl-jpa:5.0.0")
    implementation("com.querydsl:querydsl-kotlin:5.0.0")
    
    kapt("com.querydsl:querydsl-apt:5.0.0:jpa")
    kapt("jakarta.persistence:jakarta.persistence-api")
    kapt("jakarta.annotation:jakarta.annotation-api")
}

sourceSets {
    main {
        kotlin.srcDir("$buildDir/generated/source/kapt/main")
    }
}
```

### 2. QueryDSL을 사용한 페치 조인 (Kotlin)

코틀린에서 QueryDSL을 사용하면 다음과 같이 페치 조인을 구현할 수 있습니다:

```kotlin
import com.querydsl.jpa.impl.JPAQueryFactory
import javax.persistence.EntityManager
import org.springframework.stereotype.Repository

@Repository
class TeamQueryRepository(
    private val em: EntityManager
) {
    private val queryFactory = JPAQueryFactory(em)
    private val team = QTeam.team
    private val member = QMember.member

    fun findAllWithMembers(): List<Team> {
        return queryFactory
            .selectFrom(team)
            .leftJoin(team.members, member).fetchJoin()
            .distinct()
            .fetch()
    }
}
```

### 3. 동적 쿼리와 함께 사용 (Kotlin)

코틀린에서는 확장 함수와 결합하여 더 깔끔한 동적 쿼리를 작성할 수 있습니다:

```kotlin
data class TeamSearchCondition(
    val name: String? = null,
    val memberName: String? = null
)

fun findTeamsByCondition(condition: TeamSearchCondition): List<Team> {
    return queryFactory
        .selectFrom(team)
        .leftJoin(team.members, member).fetchJoin()
        .where(
            team.nameContains(condition.name),
            member.nameContains(condition.memberName)
        )
        .distinct()
        .fetch()
}

// 코틀린 확장 함수를 이용한 편리한 null 처리
private fun QTeam.nameContains(name: String?): BooleanExpression? {
    return name?.let { this.name.contains(it) }
}

private fun QMember.nameContains(name: String?): BooleanExpression? {
    return name?.let { this.name.contains(it) }
}
```

### 4. 복잡한 조회 최적화 (Kotlin)

여러 엔티티가 연관된 복잡한 조회의 경우, QueryDSL의 프로젝션 기능을 활용하면 더 효율적인 쿼리를 작성할 수 있습니다:

```kotlin
data class TeamDto(
    val id: Long,
    val name: String,
    val memberCount: Long
)

fun findTeamWithMemberCount(): List<TeamDto> {
    return queryFactory
        .select(
            Projections.constructor(
                TeamDto::class.java,
                team.id,
                team.name,
                team.members.size().toLong()
            )
        )
        .from(team)
        .fetch()
}
```

## 실무에서의 성능 개선 사례

실제 프로젝트에서 N+1 문제를 해결하고 QueryDSL을 도입한 후의 성능 개선 사례를 살펴보겠습니다.

### 사례 1: 주문 내역 조회 API

온라인 쇼핑몰 서비스에서 주문 내역을 조회하는 API가 있었습니다. 주문과 주문 상품, 상품 정보를 함께 조회해야 했는데, 초기에는 다음과 같은 문제가 있었습니다:

```
주문 목록 조회(1번) + 각 주문별 주문상품 조회(N번) + 각 주문상품별 상품정보 조회(M번)
```

이로 인해 한 페이지에 10개의 주문을 보여줄 때 최악의 경우 수십 번의 쿼리가 발생했습니다.

코틀린과 QueryDSL을 사용한 개선 코드:

```kotlin
data class OrderSummaryDto(
    val orderId: Long,
    val orderDate: LocalDateTime,
    val status: OrderStatus,
    val items: List<OrderItemDto>
) {
    constructor(order: Order) : this(
        orderId = order.id!!,
        orderDate = order.orderDate,
        status = order.status,
        items = order.orderItems.map { OrderItemDto(it) }
    )
}

data class OrderItemDto(
    val itemId: Long,
    val itemName: String,
    val price: Int,
    val count: Int
) {
    constructor(orderItem: OrderItem) : this(
        itemId = orderItem.item.id!!,
        itemName = orderItem.item.name,
        price = orderItem.orderPrice,
        count = orderItem.count
    )
}

fun getOrderSummaryList(memberId: Long, pageable: Pageable): List<OrderSummaryDto> {
    // 주문 기본 정보와 주문상품, 상품을 한 번에 조회
    val orders = queryFactory
        .selectFrom(order)
        .leftJoin(order.orderItems, orderItem).fetchJoin()
        .leftJoin(orderItem.item, item).fetchJoin()
        .where(order.member.id.eq(memberId))
        .offset(pageable.offset)
        .limit(pageable.pageSize.toLong())
        .fetch()
        
    // DTO 변환 - 코틀린의 map 함수로 간결하게 표현
    return orders.map { OrderSummaryDto(it) }
}
```

개선 결과:
- 쿼리 수: 수십 개 → 1개
- 응답 시간: 평균 1.2초 → 0.3초 (약 75% 개선)

### 사례 2: 게시판 목록 조회

게시판 목록을 조회할 때 게시글 작성자와 댓글 수를 함께 표시해야 했습니다. 초기 구현에서는 N+1 문제가 발생했습니다:

```
게시글 목록 조회(1번) + 각 게시글별 작성자 정보 조회(N번) + 각 게시글별 댓글 수 조회(N번)
```

코틀린과 QueryDSL을 사용한 개선 코드:

```kotlin
data class BoardSearchCondition(
    val title: String? = null,
    val content: String? = null,
    val categoryId: Long? = null
)

data class BoardListDto(
    val id: Long,
    val title: String,
    val content: String,
    val createdDate: LocalDateTime,
    val memberId: Long,
    val memberName: String,
    val commentCount: Long
)

fun getBoardList(condition: BoardSearchCondition, pageable: Pageable): Page<BoardListDto> {
    // 게시글 수 카운트 쿼리
    val total = queryFactory
        .select(board.count())
        .from(board)
        .where(
            board.titleContains(condition.title),
            board.contentContains(condition.content),
            board.categoryEq(condition.categoryId)
        )
        .fetchOne() ?: 0L
        
    // 게시글 목록 조회 쿼리 (작성자와 댓글 수 포함)
    val content = queryFactory
        .select(
            Projections.constructor(
                BoardListDto::class.java,
                board.id,
                board.title,
                board.content,
                board.createdDate,
                member.id,
                member.name,
                JPAExpressions
                    .select(comment.count())
                    .from(comment)
                    .where(comment.board.id.eq(board.id))
            )
        )
        .from(board)
        .leftJoin(board.member, member)
        .where(
            board.titleContains(condition.title),
            board.contentContains(condition.content),
            board.categoryEq(condition.categoryId)
        )
        .offset(pageable.offset)
        .limit(pageable.pageSize.toLong())
        .orderBy(board.createdDate.desc())
        .fetch()
        
    return PageImpl(content, pageable, total)
}

// 코틀린 확장 함수로 표현한 조건들
private fun QBoard.titleContains(title: String?): BooleanExpression? {
    return title?.let { this.title.contains(it) }
}

private fun QBoard.contentContains(content: String?): BooleanExpression? {
    return content?.let { this.content.contains(it) }
}

private fun QBoard.categoryEq(categoryId: Long?): BooleanExpression? {
    return categoryId?.let { this.category.id.eq(it) }
}
```

개선 결과:
- 쿼리 수: 1 + 2N → 2
- 응답 시간: 평균 0.8초 → 0.15초 (약 80% 개선)

## 주의사항 및 팁

### 1. 페치 조인의 한계

페치 조인을 사용할 때 주의할 점이 있습니다:

- 둘 이상의 컬렉션은 페치 조인할 수 없습니다.
- 컬렉션을 페치 조인하면 페이징 API를 사용할 수 없습니다(일대다 관계에서 데이터 뻥튀기 문제).

해결책:
- 단일 컬렉션만 페치 조인하기
- `@BatchSize`와 함께 사용하기
- 다대일 관계는 여러 개 페치 조인해도 괜찮음

### 2. DTO 직접 조회 고려하기

엔티티 전체가 필요하지 않고 몇 개의 필드만 필요한 경우, DTO로 직접 조회하는 것이 더 효율적일 수 있습니다:

```kotlin
data class TeamSimpleDto(
    val id: Long,
    val name: String,
    val memberCount: Long
)

fun findTeamSimple(): List<TeamSimpleDto> {
    return queryFactory
        .select(
            Projections.constructor(
                TeamSimpleDto::class.java,
                team.id,
                team.name,
                team.members.size().toLong()
            )
        )
        .from(team)
        .fetch()
}
```

### 3. 애플리케이션 레벨에서 추가 최적화

경우에 따라서는 메모리에서 직접 처리하는 것이 더 효율적일 수 있습니다:

```kotlin
// 팀과 멤버를 별도 쿼리로 조회 후 애플리케이션에서 조립
val teams = teamRepository.findAll()
val teamIds = teams.map { it.id!! }

val members = memberRepository.findByTeamIdIn(teamIds)
val memberMap = members.groupBy { it.team.id }

// 코틀린의 강력한 Collection API를 활용한 조립
teams.forEach { team ->
    val teamMembers = memberMap[team.id] ?: emptyList()
    // 읽기 전용 리스트를 변경 가능한 리스트로 변환하여 설정
    team.members.clear()
    team.members.addAll(teamMembers)
}
```

## 코틀린과 QueryDSL의 시너지

코틀린을 사용하면 QueryDSL을 더욱 우아하게 사용할 수 있습니다:

### 1. 확장 함수를 활용한 DSL 구축

```kotlin
// BooleanExpression을 합치는 확장 함수
fun BooleanExpression?.and(other: BooleanExpression?): BooleanExpression? {
    return when {
        this == null -> other
        other == null -> this
        else -> this.and(other)
    }
}

// 이를 이용한 조건 구성
fun findPosts(condition: PostSearchCondition): List<Post> {
    var predicate: BooleanExpression? = null
    
    condition.title?.let {
        predicate = predicate.and(post.title.contains(it))
    }
    
    condition.content?.let {
        predicate = predicate.and(post.content.contains(it))
    }
    
    return queryFactory
        .selectFrom(post)
        .where(predicate)
        .fetch()
}
```

### 2. apply, with, let 등의 스코프 함수 활용

```kotlin
fun findComplexQuery(condition: SearchCondition) = queryFactory.apply {
    return select(
        Projections.constructor(
            ResultDto::class.java,
            post.id,
            post.title,
            post.views
        )
    )
    .from(post)
    .where(
        with(condition) {
            listOfNotNull(
                title?.let { post.title.contains(it) },
                author?.let { post.author.eq(it) },
                fromDate?.let { post.createdDate.goe(it) },
                toDate?.let { post.createdDate.loe(it) }
            ).takeIf { it.isNotEmpty() }?.reduce { acc, expr -> acc.and(expr) }
        }
    )
    .fetch()
}
```

## 결론

JPA의 N+1 문제는 성능 저하의 주요 원인이지만, 이해하고 적절한 도구를 사용하면 효과적으로 해결할 수 있습니다. 특히 코틀린과 QueryDSL을 함께 사용하면 타입 안전하고 간결하면서도 강력한 쿼리를 작성할 수 있어 개발 생산성과 코드 품질, 성능 모두를 향상시킬 수 있습니다.

코틀린의 null 안전성, 함수형 프로그래밍 기능, 확장 함수 등은 QueryDSL과 결합했을 때 더욱 큰 시너지를 발휘합니다. 특히 동적 쿼리 작성 시 코드의 가독성과 유지보수성이 크게 향상됩니다.

실무에서는 다음과 같은 접근 방식이 효과적입니다:

1. 먼저 문제가 되는 N+1 쿼리를 식별합니다.
2. 단순한 경우 fetch join이나 EntityGraph로 해결합니다.
3. 복잡한 경우나 동적 쿼리가 필요한 경우 QueryDSL을 활용합니다.
4. 데이터 양이 많거나 복잡한 조회 로직인 경우 DTO 프로젝션이나 애플리케이션 레벨 최적화를 고려합니다.
5. 코틀린의 강력한 Collection API와 확장 함수를 활용하여 보다 간결하고 견고한 코드를 작성합니다.

JPA, QueryDSL, 그리고 코틀린을 함께 사용하면 객체지향적인 설계의 장점과 함수형 프로그래밍의 간결함, SQL의 강력함을 모두 활용할 수 있어, 유지보수성과 성능을 모두 만족시키는 애플리케이션을 개발할 수 있습니다.
